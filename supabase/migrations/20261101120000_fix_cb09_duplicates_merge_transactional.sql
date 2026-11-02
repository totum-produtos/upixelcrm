-- CB-09: Make duplicate merge transactional
-- Ensure re-linking succeeds before deleting leads

CREATE OR REPLACE FUNCTION public.merge_duplicate_leads(
  primary_lead_id uuid,
  duplicate_lead_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dup_id uuid;
  _relinked int := 0;
  _deleted int := 0;
BEGIN
  -- Re-link all related records to primary lead first
  FOR _dup_id IN SELECT unnest(duplicate_lead_ids)
  LOOP
    -- Re-link conversations
    UPDATE public.conversations SET lead_id = primary_lead_id WHERE lead_id = _dup_id;
    GET DIAGNOSTICS _relinked = ROW_COUNT;

    -- Re-link tasks
    UPDATE public.tasks SET lead_id = primary_lead_id WHERE lead_id = _dup_id;

    -- Re-link messages
    UPDATE public.messages SET lead_id = primary_lead_id WHERE lead_id = _dup_id;

    -- Re-link timeline events
    UPDATE public.timeline_events SET lead_id = primary_lead_id WHERE lead_id = _dup_id;
  END LOOP;

  -- Only delete duplicates after successful re-linking
  DELETE FROM public.leads WHERE id = ANY(duplicate_lead_ids);
  GET DIAGNOSTICS _deleted = ROW_COUNT;

  RETURN jsonb_build_object('relinked', _relinked, 'deleted', _deleted);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.merge_duplicate_leads(uuid, uuid[]) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.merge_duplicate_leads(uuid, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.merge_duplicate_leads(uuid, uuid[]) TO service_role;
