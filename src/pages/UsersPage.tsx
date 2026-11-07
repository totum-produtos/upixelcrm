import { useEffect, useState, useMemo, useCallback } from "react";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Users, Building2, Shield, Mail, Search, Ban, CheckCircle2,
  PencilLine, Trash2, UserPlus, UserMinus, ChevronDown, ChevronUp, Loader2, FileText, Plus
} from "lucide-react";
import { EditRoleDialog } from "@/components/users/EditRoleDialog";
import { AddMemberDialog } from "@/components/users/AddMemberDialog";
import { CreateUserDialog } from "@/components/users/CreateUserDialog";
import { UsersStats } from "@/components/users/UsersStats";
import { UsersListTab } from "@/components/users/UsersListTab";
import { OrgsTab } from "@/components/users/OrgsTab";
import { useUsersData } from "@/hooks/useUsersData";
import { useUsersListFilters } from "@/hooks/useUsersListFilters";
import { PermissionMatrixTab } from "@/components/users/PermissionMatrixTab";
import { AuditLogTab } from "@/components/users/AuditLogTab";
import type { ProfileRow, OrgRow, AuditLogRow } from "@/components/users/types";

export default function UsersPage() {
  const { user } = useAuth();
  const { tenant } = useTenant();

  
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

  const isMaster = user?.role === "master";
  const currentTenantId = tenant?.id || user?.tenant_id || null;

  const { profiles, orgs, loading, auditLogs, auditLoading, fetchData, fetchAuditLogs } =
    useUsersData({ user, isMaster, currentTenantId });

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


  const {
    search, setSearch, filteredProfiles,
    orgSearch, setOrgSearch, filteredOrgs,
    expandedOrg, toggleExpandedOrg,
  } = useUsersListFilters(profiles, orgs);


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

  const stats = [
    { label: "Total Usuários", value: profiles.length, icon: Users },
    { label: "Bloqueados", value: profiles.filter(p => p.is_blocked).length, icon: Ban },
    ...(isMaster ? [
      { label: "Empresas", value: orgs.length, icon: Building2 },
      { label: "Masters", value: profiles.filter(p => p.role === "master").length, icon: Shield },
    ] : [
      { label: "Supervisores", value: profiles.filter(p => p.role === "supervisor").length, icon: Shield },
      { label: "Vendedores", value: profiles.filter(p => p.role === "vendedor").length, icon: Users },
    ])
  ];

  return (
    <AppLayout title="Usuários & Permissões" subtitle="Gerencie acesso, as permissões e sua equipe">
      <div className="animate-fade-in space-y-6 p-6">
        <UsersStats stats={stats} />

        <Tabs defaultValue="users">
          <TabsList className="bg-secondary mb-4">
            <TabsTrigger value="users" className="text-xs gap-1.5"><Users className="h-3 w-3" /> Usuários</TabsTrigger>
            {isMaster && <TabsTrigger value="orgs" className="text-xs gap-1.5"><Building2 className="h-3 w-3" /> Empresas</TabsTrigger>}
            <TabsTrigger value="roles" className="text-xs gap-1.5"><Shield className="h-3 w-3" /> Matriz de Permissões</TabsTrigger>
            <TabsTrigger value="audit" className="text-xs gap-1.5"><FileText className="h-3 w-3" /> Auditoria</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersListTab
              loading={loading}
              profiles={filteredProfiles}
              search={search}
              onSearchChange={setSearch}
              isMaster={isMaster}
              user={user}
              onCreateUser={() => setCreateUserModal(true)}
              onApprove={approveUser}
              onEditRole={(p) => { setEditModal(p); setEditRole(p.role || "vendedor"); }}
              onToggleBlock={toggleBlock}
              onDelete={deleteUser}
            />
          </TabsContent>

          {isMaster && (
            <TabsContent value="orgs">
              <OrgsTab
                loading={loading}
                orgs={filteredOrgs}
                orgSearch={orgSearch}
                onOrgSearchChange={setOrgSearch}
                expandedOrg={expandedOrg}
                onToggleExpanded={toggleExpandedOrg}
                onAddMember={(o) => { setAddMemberModal(o); setAddMemberEmail(""); }}
                onDeleteOrg={deleteOrg}
                onRemoveMember={handleRemoveMember}
              />
            </TabsContent>
          )}

          <TabsContent value="roles">
            <PermissionMatrixTab />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogTab auditLogs={auditLogs} auditLoading={auditLoading} onRefresh={fetchAuditLogs} />
          </TabsContent>
        </Tabs>
      </div>

      <EditRoleDialog
        profile={editModal}
        role={editRole}
        isMaster={isMaster}
        onRoleChange={setEditRole}
        onClose={() => setEditModal(null)}
        onSave={saveRole}
      />

      {isMaster && (
        <AddMemberDialog
          org={addMemberModal}
          email={addMemberEmail}
          adding={addingMember}
          onEmailChange={setAddMemberEmail}
          onClose={() => setAddMemberModal(null)}
          onSubmit={handleAddMember}
        />
      )}

      {isMaster && (
        <CreateUserDialog
          open={createUserModal}
          onOpenChange={setCreateUserModal}
          form={createUserForm}
          onFormChange={setCreateUserForm}
          orgs={orgs}
          creating={creatingUser}
          onSubmit={createUser}
        />
      )}
    </AppLayout>
  );
}
