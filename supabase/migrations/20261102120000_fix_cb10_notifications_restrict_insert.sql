-- CB-10: Restrict notifications INSERT to same-tenant users only
-- Remove broad WITH CHECK (true) policy

DROP POLICY IF EXISTS "Service role insert notifications" ON public.notifications;

-- Only allow insert for users in same tenant (or master/service role)
CREATE POLICY "Tenant scoped insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  (user_id IN (SELECT id FROM public.profiles WHERE tenant_id = (SELECT get_user_tenant_id()))) OR
  (SELECT is_master_user())
);

-- Revoke INSERT from anon
REVOKE INSERT ON public.notifications FROM anon;
