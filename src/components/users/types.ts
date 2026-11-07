// Tipos compartilhados da página de Usuários & Permissões.

export interface ProfileRow {
  id: string;
  name: string;
  email: string | null;
  role: string;
  is_blocked: boolean;
  approval_status?: "pending" | "approved" | "rejected";
  client_id: string;
  tenant_id: string | null;
  organization_id: string | null;
  created_at: string;
  org_name?: string;
}

export interface OrgRow {
  id: string;
  name: string;
  slug: string;
  owner_id: string | null;
  created_at: string;
  member_count?: number;
  owner_name?: string;
  members?: ProfileRow[];
}

export interface AuditLogDetails {
  target_user?: string;
  old_role?: string;
  new_role?: string;
  [key: string]: unknown;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  details: AuditLogDetails | null;
  created_at: string;
}
