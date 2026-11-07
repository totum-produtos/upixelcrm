// Regra pura de acesso a dados de um tenant a partir do profile do chamador.
// Sem imports de Deno/Supabase para poder ser testada no vitest
// (src/test/edge/whatsapp-status-probe-access.test.ts).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMPTY_TENANT_ID = "00000000-0000-0000-0000-000000000000";

export interface CallerProfile {
  role?: string | null;
  tenant_id?: string | null;
  client_id?: string | null;
  approval_status?: string | null;
  is_blocked?: boolean | null;
}

/** Tenant do chamador: tenant_id válido, senão client_id válido, senão null. */
export function resolveCallerTenant(profile: CallerProfile): string | null {
  const valid = (v: unknown): v is string =>
    typeof v === "string" && UUID_RE.test(v) && v !== EMPTY_TENANT_ID;
  if (valid(profile.tenant_id)) return profile.tenant_id;
  if (valid(profile.client_id)) return profile.client_id;
  return null;
}

/**
 * O chamador pode ler um recurso que pertence a `resourceTenantId`?
 * - bloqueado, pendente ou recusado: nunca (mesma regra do CB-01)
 * - master: sempre
 * - demais: só o próprio tenant
 */
export function canAccessTenant(profile: CallerProfile, resourceTenantId: string | null | undefined): boolean {
  if (profile.is_blocked) return false;
  if (profile.approval_status === "pending" || profile.approval_status === "rejected") return false;
  if (profile.role === "master") return true;
  const callerTenant = resolveCallerTenant(profile);
  return !!callerTenant && !!resourceTenantId && callerTenant === resourceTenantId;
}
