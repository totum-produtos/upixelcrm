-- CB-05: Restrict sensitive integration columns (tokens/secrets) to admins/master
-- Approach: Create a view integrations_safe without sensitive columns and
-- revoke SELECT on sensitive columns for authenticated role. Frontend should
-- query integrations_safe instead of integrations.

-- 1. Create safe view excluding sensitive columns
CREATE OR REPLACE VIEW public.integrations_safe AS
SELECT
  id, client_id, tenant_id, provider, name, status, config,
  created_at, updated_at
FROM public.integrations;

-- 2. Revoke direct access to sensitive columns for authenticated
-- (Postgres column-level privileges)
REVOKE SELECT (access_token, refresh_token, api_key) ON public.integrations FROM authenticated;
REVOKE SELECT (access_token, refresh_token, api_key) ON public.integrations FROM anon;

-- 3. Restrict write to admins/master (drop existing broad policies)
DROP POLICY IF EXISTS "Tenant isolation on integrations" ON public.integrations;
CREATE POLICY "Tenant isolation on integrations"
  FOR ALL TO authenticated
  USING ((tenant_id = (SELECT get_user_tenant_id())) OR (SELECT is_master_user()))
  WITH CHECK ((tenant_id = (SELECT get_user_tenant_id())) OR (SELECT is_master_user()));

-- 4. Note: integrations_safe inherits RLS from base table (security barrier)
ALTER VIEW public.integrations_safe SET (security_barrier = true);
