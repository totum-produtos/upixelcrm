-- CB-06: Remove direct INSERT policy on tenants/organizations for authenticated users
-- Signup must go through an Edge Function that validates the gate password
-- server-side and uses service role.

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;

-- No direct INSERT allowed for authenticated on these tables
-- (only service role via Edge Function can create)
REVOKE INSERT ON public.tenants FROM authenticated;
REVOKE INSERT ON public.organizations FROM authenticated;

-- Keep SELECT/UPDATE for owners
CREATE POLICY "Owners can view their organization"
ON public.organizations FOR SELECT TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Owners can update their organization"
ON public.organizations FOR UPDATE TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Members can view tenant"
ON public.tenants FOR SELECT TO authenticated
USING (id = (SELECT get_user_tenant_id()) OR (SELECT is_master_user()));

-- Create Edge Function placeholder note (actual function in supabase/functions/)
COMMENT ON TABLE public.tenants IS 'Tenant creation restricted to service role via Edge Function (signup-gate).';
