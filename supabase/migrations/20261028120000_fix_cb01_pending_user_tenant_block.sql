-- CB-01: Block users with approval_status != 'approved' from tenant-scoped data
-- Pending/rejected users must not access any tenant data via RLS
-- Masters remain exempt; service_role/migrations bypass as before

-- Extend profile cache to include approval_status
CREATE OR REPLACE FUNCTION public.get_cached_profile_field(field_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _tx_key  TEXT := 'app.profile.' || COALESCE(_user_id::text, 'anon') || '.' || field_name;
  _sess_key TEXT := 'app.profile.sess.' || COALESCE(_user_id::text, 'anon') || '.' || field_name;
  _val TEXT;
  _row RECORD;
BEGIN
  IF _user_id IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    _val := current_setting(_tx_key, true);
  EXCEPTION WHEN OTHERS THEN
    _val := NULL;
  END;
  IF _val IS NOT NULL THEN
    RETURN _val;
  END IF;

  BEGIN
    _val := current_setting(_sess_key, true);
  EXCEPTION WHEN OTHERS THEN
    _val := NULL;
  END;
  IF _val IS NOT NULL THEN
    PERFORM set_config(_tx_key, _val, true);
    RETURN _val;
  END IF;

  SELECT client_id, tenant_id::text, role, is_blocked::text, approval_status::text
    INTO _row
    FROM public.profiles
   WHERE id = _user_id;

  IF _row IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM set_config('app.profile.' || _user_id::text || '.client_id',        COALESCE(_row.client_id, ''),        true);
  PERFORM set_config('app.profile.' || _user_id::text || '.tenant_id',        COALESCE(_row.tenant_id, ''),        true);
  PERFORM set_config('app.profile.' || _user_id::text || '.role',             COALESCE(_row.role, ''),             true);
  PERFORM set_config('app.profile.' || _user_id::text || '.is_blocked',       COALESCE(_row.is_blocked, ''),       true);
  PERFORM set_config('app.profile.' || _user_id::text || '.approval_status',  COALESCE(_row.approval_status, ''),  true);

  PERFORM set_config('app.profile.sess.' || _user_id::text || '.client_id',       COALESCE(_row.client_id, ''),        false);
  PERFORM set_config('app.profile.sess.' || _user_id::text || '.tenant_id',       COALESCE(_row.tenant_id, ''),        false);
  PERFORM set_config('app.profile.sess.' || _user_id::text || '.role',            COALESCE(_row.role, ''),             false);
  PERFORM set_config('app.profile.sess.' || _user_id::text || '.is_blocked',      COALESCE(_row.is_blocked, ''),       false);
  PERFORM set_config('app.profile.sess.' || _user_id::text || '.approval_status', COALESCE(_row.approval_status, ''),  false);

  CASE field_name
    WHEN 'client_id'       THEN RETURN COALESCE(_row.client_id, '');
    WHEN 'tenant_id'       THEN RETURN COALESCE(_row.tenant_id, '');
    WHEN 'role'            THEN RETURN COALESCE(_row.role, '');
    WHEN 'is_blocked'      THEN RETURN COALESCE(_row.is_blocked, '');
    WHEN 'approval_status' THEN RETURN COALESCE(_row.approval_status, '');
    ELSE RETURN NULL;
  END CASE;
END;
$$;

-- Helper to check if user is approved (masters exempt)
CREATE OR REPLACE FUNCTION public.is_user_approved()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(public.get_cached_profile_field('role'), '') = 'master' THEN true
    WHEN COALESCE(public.get_cached_profile_field('approval_status'), '') = 'approved' THEN true
    ELSE false
  END
$$;

-- Block pending users: get_user_tenant_id returns NULL for non-approved (except master)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(public.get_cached_profile_field('role'), '') = 'master' THEN
    RETURN public.get_cached_profile_field('tenant_id')::UUID;
  END IF;
  IF COALESCE(public.get_cached_profile_field('approval_status'), '') <> 'approved' THEN
    RETURN NULL;
  END IF;
  RETURN public.get_cached_profile_field('tenant_id')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Block pending users: get_user_client_id returns NULL for non-approved (except master)
CREATE OR REPLACE FUNCTION public.get_user_client_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(public.get_cached_profile_field('role'), '') = 'master' THEN
    RETURN public.get_cached_profile_field('client_id');
  END IF;
  IF COALESCE(public.get_cached_profile_field('approval_status'), '') <> 'approved' THEN
    RETURN NULL;
  END IF;
  RETURN public.get_cached_profile_field('client_id');
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Update cache invalidation to include approval_status
CREATE OR REPLACE FUNCTION public.invalidate_profile_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid TEXT := COALESCE(NEW.id::text, OLD.id::text);
BEGIN
  PERFORM set_config('app.profile.' || _uid || '.client_id',        NULL, true);
  PERFORM set_config('app.profile.' || _uid || '.tenant_id',        NULL, true);
  PERFORM set_config('app.profile.' || _uid || '.role',             NULL, true);
  PERFORM set_config('app.profile.' || _uid || '.is_blocked',       NULL, true);
  PERFORM set_config('app.profile.' || _uid || '.approval_status',  NULL, true);
  PERFORM set_config('app.profile.sess.' || _uid || '.client_id',       NULL, false);
  PERFORM set_config('app.profile.sess.' || _uid || '.tenant_id',       NULL, false);
  PERFORM set_config('app.profile.sess.' || _uid || '.role',            NULL, false);
  PERFORM set_config('app.profile.sess.' || _uid || '.is_blocked',      NULL, false);
  PERFORM set_config('app.profile.sess.' || _uid || '.approval_status', NULL, false);
  RETURN NEW;
END;
$$;
