import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AuthUser } from "@/contexts/AuthContext";
import type { AuditLogRow, OrgRow, ProfileRow } from "@/components/users/types";

interface UseUsersDataParams {
  user: AuthUser | null;
  isMaster: boolean;
  currentTenantId: string | null;
}

// Carrega perfis, empresas e log de auditoria. As consultas e o escopo de tenant
// são os mesmos da página original, apenas movidos para cá.
export function useUsersData({ user, isMaster, currentTenantId }: UseUsersDataParams) {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Filtro CRÍTICO server-side: não-master só pode listar profiles do próprio tenant.
    // Antes filtrávamos client-side, o que vazava dados de TODOS os tenants no payload de rede.
    let profilesQuery = supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (!isMaster) {
      if (currentTenantId) {
        profilesQuery = profilesQuery.eq("tenant_id", currentTenantId);
      } else if (user?.organization_id) {
        profilesQuery = profilesQuery.eq("organization_id", user.organization_id);
      } else {
        // Sem tenant nem organization no contexto: só pode ver o próprio profile.
        profilesQuery = profilesQuery.eq("id", user?.id ?? "");
      }
    }

    const [profilesRes, orgsRes] = await Promise.all([
      profilesQuery,
      isMaster ? supabase.from("organizations").select("*").order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    ]);

    const profilesList = (profilesRes.data || []) as ProfileRow[];
    const orgsList = (orgsRes.data || []) as OrgRow[];

    const orgMap = new Map(orgsList.map(o => [o.id, o.name]));
    for (const p of profilesList) {
      if (p.organization_id) p.org_name = orgMap.get(p.organization_id) || "—";
    }

    if (isMaster) {
      for (const o of orgsList) {
        o.members = profilesList.filter(p => p.organization_id === o.id);
        o.member_count = o.members.length;
        const owner = profilesList.find(p => p.id === o.owner_id);
        o.owner_name = owner?.name || "—";
      }
    }

    setProfiles(profilesList);
    setOrgs(orgsList);
    setLoading(false);
  }, [isMaster, currentTenantId, user]);

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    let query = supabase.from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    // Filter by tenant_id if not master user
    if (!isMaster && currentTenantId) {
      query = query.eq("tenant_id", currentTenantId);
    }

    const { data, error } = await query;
    if (!error && data) setAuditLogs(data as AuditLogRow[]);
    setAuditLoading(false);
  }, [isMaster, currentTenantId]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (user) fetchAuditLogs(); }, [user, fetchAuditLogs]);

  return { profiles, orgs, loading, auditLogs, auditLoading, fetchData, fetchAuditLogs };
}
