import { useState } from "react";
import type { OrgRow, ProfileRow } from "@/components/users/types";

// Estado de UI das listas de usuários e empresas (busca e empresa expandida).
// Fica em hook chamado pela página para sobreviver à troca de abas, como antes.
export function useUsersListFilters(profiles: ProfileRow[], orgs: OrgRow[]) {
  const [search, setSearch] = useState("");
  const [orgSearch, setOrgSearch] = useState("");
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);

  const filteredProfiles = profiles.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredOrgs = orgs.filter(o =>
    o.name.toLowerCase().includes(orgSearch.toLowerCase()) ||
    o.slug.toLowerCase().includes(orgSearch.toLowerCase())
  );

  const toggleExpandedOrg = (orgId: string) => setExpandedOrg(expandedOrg === orgId ? null : orgId);

  return {
    search, setSearch, filteredProfiles,
    orgSearch, setOrgSearch, filteredOrgs,
    expandedOrg, toggleExpandedOrg,
  };
}
