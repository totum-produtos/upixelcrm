import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Escopo de tenant para operações em massa nos componentes (filtro explícito
 * de client_id além da RLS, ADR-UPX-007). Mesma regra de useAppScope:
 * clientId = tenant.id ?? user.client_id; masterView = master no subdomínio
 * "master" (opera entre tenants, não filtra).
 */
export function useTenantScope(): { clientId: string; masterView: boolean } {
  const { user } = useAuth();
  const { tenant } = useTenant();
  return {
    clientId: tenant?.id ?? user?.client_id ?? "",
    masterView: user?.role === "master" && tenant?.subdomain === "master",
  };
}
