import { useState, useCallback } from "react";
import { logger } from "@/lib/logger";
import * as leadsRepo from "@/services/leads";
import { mapTimeline } from "@/contexts/app/mappers";
import type { TimelineEvent } from "@/types";
import type { AddTimelineEvent, AppScope } from "@/contexts/app/types";

/** Fatia de timeline: estado dos eventos e o registro de novos eventos. */
export function useTimelineSlice(scope: AppScope) {
  const { tenantId, userClientId, userId, tenantIdForInsert } = scope;
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  const addTimelineEvent = useCallback<AddTimelineEvent>(async (event) => {
    const clientId = tenantId ?? userClientId;
    if (!clientId) { logger.error(new Error("addTimelineEvent sem client_id")); return; }
    let data: Awaited<ReturnType<typeof leadsRepo.insertTimelineEvent>>;
    try {
      data = await leadsRepo.insertTimelineEvent({
        lead_id: event.lead_id || null,
        type: event.type,
        content: event.content,
        user_name: event.user_name,
        user_id: event.user_id ?? userId ?? null,
        client_id: clientId,
        ...tenantIdForInsert,
      });
    } catch (error) {
      logger.error(error); return;
    }
    if (data) setTimeline((prev) => [mapTimeline(data), ...prev]);
  }, [tenantId, userClientId, userId, tenantIdForInsert]);

  return { timeline, setTimeline, addTimelineEvent };
}
