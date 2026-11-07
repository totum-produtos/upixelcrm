import { useMemo } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import type { AppScope } from "@/contexts/app/types";

/**
 * Deriva o escopo (tenant, usuario, master view) usado por todas as fatias.
 *
 * FIX-07: o client_id vem do profile do AuthContext (tabela profiles) e nao do
 * user_metadata mutavel. O fallback antigo "c1" podia escopar queries no tenant
 * errado quando user_metadata faltava, causando vazamento/perda de dados.
 */
export function useAppScope(): AppScope {
  const { user } = useAuth();
  const { tenant } = useTenant();

  // Master view: master user no subdomínio "master" vê dados de TODOS os tenants (RLS permite)
  const isMasterView = user?.role === "master" && tenant?.subdomain === "master";

  // Em master view, tenant.id é a string "master" (sentinela, não UUID).
  // Para inserts em colunas tenant_id (UUID), só inclui se for UUID válido.
  // Memoizado por tenant?.id para manter referência estável entre renders:
  // permite incluir nas deps de useCallback sem causar re-render infinito.
  const tenantIdForInsert = useMemo<{ tenant_id?: string }>(() => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return tenant?.id && UUID_RE.test(tenant.id) ? { tenant_id: tenant.id } : {};
  }, [tenant?.id]);

  return {
    tenantId: tenant?.id,
    userClientId: user?.client_id,
    userId: user?.id,
    isMasterView,
    tenantIdForInsert,
  };
}
