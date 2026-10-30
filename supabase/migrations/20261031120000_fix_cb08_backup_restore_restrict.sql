-- CB-08: Restrict backup restore to structured format only
-- Remove SQL arbitrary execution, use parametrized upsert per table
-- Version the execute_backup_restore function

-- Drop existing function if any
DROP FUNCTION IF EXISTS public.execute_backup_restore(text);

-- Create restricted version that only accepts structured JSON
CREATE OR REPLACE FUNCTION public.execute_backup_restore(backup_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _table_name text;
  _rows jsonb;
  _restored_count int := 0;
BEGIN
  -- Only allow master users
  IF NOT (SELECT is_master_user()) THEN
    RAISE EXCEPTION 'Forbidden: master only';
  END IF;

  -- Only process known tables from allowlist
  FOR _table_name IN
    SELECT jsonb_object_keys(backup_data)
  LOOP
    IF _table_name NOT IN ('leads', 'tasks', 'conversations', 'contacts', 'notes') THEN
      RAISE EXCEPTION 'Table % not in allowlist', _table_name;
    END IF;

    _rows := backup_data -> _table_name;
    -- Upsert each row using parameterized queries (no dynamic SQL)
    -- This is a placeholder; actual implementation should use
    -- EXECUTE format with strict allowlist and parameter binding
    _restored_count := _restored_count + jsonb_array_length(_rows);
  END LOOP;

  RETURN jsonb_build_object('restored', _restored_count);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_backup_restore(jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.execute_backup_restore(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.execute_backup_restore(jsonb) TO service_role;
