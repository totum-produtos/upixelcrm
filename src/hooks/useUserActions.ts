import { useState } from "react";
import { logger } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AuthUser } from "@/contexts/AuthContext";
import type { OrgRow, ProfileRow } from "@/components/users/types";

interface UseUserActionsParams {
  user: AuthUser | null;
  isMaster: boolean;
  currentTenantId: string | null;
  profiles: ProfileRow[];
  fetchData: () => Promise<void>;
  fetchAuditLogs: () => Promise<void>;
}

// Estado dos modais e ações de gestão de usuários e empresas. Cada handler é o
// mesmo código da página original (mesmas verificações de master/supervisor,
// mesmas RPCs e edge function), apenas movido para cá.
export function useUserActions({
  user, isMaster, currentTenantId, profiles, fetchData, fetchAuditLogs,
}: UseUserActionsParams) {
  // Edit Role Modal
  const [editModal, setEditModal] = useState<ProfileRow | null>(null);
  const [editRole, setEditRole] = useState("");
  
  // Orgs specific
  const [addMemberModal, setAddMemberModal] = useState<OrgRow | null>(null);
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // Create User Modal
  const [createUserModal, setCreateUserModal] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "vendedor",
    organization_id: "",
  });
  const [creatingUser, setCreatingUser] = useState(false);

  const logAudit = async (action: string, details?: Record<string, any>) => {
    try {
      await supabase.from("audit_log").insert({
        user_id: user?.id,
        user_name: user?.name || "Sistema",
        action,
        details: details || null,
        tenant_id: currentTenantId,
      });
    } catch (_) { /* silent */ }
  };

  const toggleBlock = async (profile: ProfileRow) => {
    if (!isMaster && user?.role !== "supervisor") {
      toast.error("Você não tem permissão para bloquear este usuário.");
      return;
    }

    const rpcName = isMaster ? "admin_toggle_block" : "supervisor_toggle_block";
    const { error } = await supabase.rpc(rpcName as any, {
      target_user_id: profile.id,
      block_status: !profile.is_blocked,
    });
    if (error) { toast.error("Erro: " + error.message); return; }
    const action = profile.is_blocked ? "Usuário desbloqueado" : "Usuário bloqueado";
    toast.success(action);
    await logAudit(action, { target_user: profile.name, target_id: profile.id });
    fetchData();
    fetchAuditLogs();
  };

  const deleteUser = async (profile: ProfileRow) => {
    if (!isMaster) {
      toast.error("Apenas masters podem deletar usuários.");
      return;
    }

    if (!confirm(`Excluir permanentemente o usuário "${profile.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    const { error } = await supabase.rpc("admin_delete_user" as any, {
      target_user_id: profile.id,
    });

    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }

    toast.success(`Usuário "${profile.name}" deletado permanentemente`);
    await logAudit("Usuário deletado", { target_user: profile.name, target_id: profile.id });
    fetchData();
    fetchAuditLogs();
  };

  const approveUser = async (profile: ProfileRow) => {
    if (!isMaster) {
      toast.error("Apenas masters podem aprovar usuários.");
      return;
    }

    const { error } = await supabase.rpc("admin_approve_user" as any, {
      target_user_id: profile.id,
    });

    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }

    toast.success(`Usuário "${profile.name}" aprovado`);
    await logAudit("Usuário aprovado", { target_user: profile.name, target_id: profile.id });
    fetchData();
    fetchAuditLogs();
  };

  const createUser = async () => {
    if (!isMaster) {
      toast.error("Apenas masters podem criar usuários.");
      return;
    }

    const { name, email, password, role, organization_id } = createUserForm;

    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Preenchimento obrigatório: nome, e-mail e senha");
      return;
    }

    setCreatingUser(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar autenticado");
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-create-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          role,
          organization_id: organization_id || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Erro ao criar usuário");
        return;
      }

      toast.success(`Usuário "${name}" criado com sucesso!`);
      await logAudit("Usuário criado", { target_user: name, target_id: result.user.id, role });

      setCreateUserModal(false);
      setCreateUserForm({ name: "", email: "", password: "", role: "vendedor", organization_id: "" });
      fetchData();
      fetchAuditLogs();
    } catch (error: any) {
      logger.error("Error creating user:", error);
      toast.error(error.message || "Erro ao criar usuário");
    } finally {
      setCreatingUser(false);
    }
  };

  const saveRole = async () => {
    if (!editModal) return;

    if (!isMaster && user?.role !== "supervisor") {
      toast.error("Você não tem permissão para alterar a permissão deste usuário.");
      setEditModal(null);
      return;
    }

    const rpcName = isMaster ? "admin_set_role" : "supervisor_set_role";
    const { error } = await supabase.rpc(rpcName as any, {
      target_user_id: editModal.id,
      new_role: editRole,
    });
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Permissão atualizada com sucesso.");
    await logAudit("Permissão alterada", { target_user: editModal.name, target_id: editModal.id, old_role: editModal.role, new_role: editRole });
    setEditModal(null);
    fetchData();
    fetchAuditLogs();
  };

  // Org actions (Master only)
  const deleteOrg = async (org: OrgRow) => {
    if (!isMaster) return;
    if (!confirm(`Excluir a empresa "${org.name}"? Membros perderão o vínculo.`)) return;
    if (org.members && org.members.length > 0) {
      for (const m of org.members) {
        await supabase.rpc("admin_remove_org_member" as any, { target_user_id: m.id });
      }
    }
    const { error } = await supabase.from("organizations").delete().eq("id", org.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Empresa excluída");
    fetchData();
  };

  const handleAddMember = async () => {
    if (!addMemberModal || !addMemberEmail.trim()) return;
    setAddingMember(true);
    try {
      const target = profiles.find(p => p.email?.toLowerCase() === addMemberEmail.trim().toLowerCase());
      if (!target) {
        toast.error("Usuário não encontrado. Ele precisa ter uma conta cadastrada.");
        return;
      }
      if (target.organization_id) {
        toast.error("Esse usuário já pertence a uma empresa. Remova-o primeiro.");
        return;
      }
      const { error } = await supabase.rpc("admin_add_org_member" as any, {
        target_user_id: target.id,
        target_org_id: addMemberModal.id,
      });
      if (error) throw error;
      toast.success(`${target.name} adicionado à empresa!`);
      setAddMemberModal(null);
      setAddMemberEmail("");
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Erro ao adicionar membro");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (member: ProfileRow, org: OrgRow) => {
    if (member.id === org.owner_id) {
      toast.error("Não é possível remover o proprietário da empresa.");
      return;
    }
    if (!confirm(`Remover ${member.name} da empresa ${org.name}?`)) return;
    const { error } = await supabase.rpc("admin_remove_org_member" as any, { target_user_id: member.id });
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(`${member.name} removido da empresa`);
    fetchData();
  };
  return {
    editModal, setEditModal, editRole, setEditRole,
    addMemberModal, setAddMemberModal, addMemberEmail, setAddMemberEmail, addingMember,
    createUserModal, setCreateUserModal, createUserForm, setCreateUserForm, creatingUser,
    toggleBlock, deleteUser, approveUser, createUser, saveRole,
    deleteOrg, handleAddMember, handleRemoveMember,
  };
}
