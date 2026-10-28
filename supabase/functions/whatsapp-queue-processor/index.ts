import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

interface QueueItem {
  id: string;
  client_id: string;
  conversation_id: string;
  message_data: any;
  source: string;
  attempt_count: number;
  max_attempts: number;
}

async function processQueueItem(adminClient: any, item: QueueItem): Promise<boolean> {
  try {
    const { data: claimed } = await adminClient
      .from("whatsapp_message_queue")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", item.id)
      .eq("status", "pending")
      .select("id");

    if (!claimed || claimed.length === 0) {
      console.log(`Queue item ${item.id} já reivindicado por outra execução`);
      return true;
    }

    const { data: conversation } = await adminClient
      .from("conversations")
      .select("lead_id")
      .eq("id", item.conversation_id)
      .single();

    if (!conversation?.lead_id) {
      throw new Error("Conversation has no lead_id");
    }

    const messageData = item.message_data;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    await fetch(`${supabaseUrl}/functions/v1/automation-engine`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        trigger_type: "new_message",
        client_id: item.client_id,
        lead_id: conversation.lead_id,
        message: messageData.content || "",
        message_type: messageData.type || "text",
        channel: item.source === "evolution" ? "whatsapp" : "whatsapp_cloud",
      }),
    });

    await adminClient
      .from("whatsapp_message_queue")
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    console.log(`✓ Queue item ${item.id} processed successfully`);
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const newAttemptCount = item.attempt_count + 1;
    const shouldRetry = newAttemptCount < item.max_attempts;

    console.error(`✗ Queue item ${item.id} failed (attempt ${newAttemptCount}):`, errorMsg);

    await adminClient
      .from("whatsapp_message_queue")
      .update({
        status: shouldRetry ? "pending" : "failed",
        attempt_count: newAttemptCount,
        error_message: errorMsg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    return !shouldRetry;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const cronBearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const cronSecret = (Deno.env.get("CRON_SECRET") ?? "").trim();
  const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  const anonKey = (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();

  const authorized =
    (cronSecret && timingSafeEqual(cronBearer, cronSecret)) ||
    (serviceKey && timingSafeEqual(cronBearer, serviceKey));

  if (!authorized || (anonKey && timingSafeEqual(cronBearer, anonKey))) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 403,
    });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceKey
    );

    console.log("Starting WhatsApp queue processor...");

    const stuckBefore = new Date(Date.now() - 10 * 60_000).toISOString();
    const { data: reaped } = await adminClient
      .from("whatsapp_message_queue")
      .update({ status: "pending", updated_at: new Date().toISOString() })
      .eq("status", "processing")
      .lt("updated_at", stuckBefore)
      .select("id");
    if (reaped?.length) console.warn(`Reaped ${reaped.length} item(ns) presos em processing`);

    const { data: queueItems, error: fetchError } = await adminClient
      .from("whatsapp_message_queue")
      .select("*")
      .eq("status", "pending")
      .eq("route", "salesbot")
      .order("created_at", { ascending: true })
      .limit(100);

    if (fetchError) {
      throw new Error(`Failed to fetch queue: ${fetchError.message}`);
    }

    if (!queueItems || queueItems.length === 0) {
      console.log("No pending queue items");
      return new Response(
        JSON.stringify({ processed: 0, message: "No pending items" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${queueItems.length} pending items`);

    const maxConcurrent = 5;
    let processedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < queueItems.length; i += maxConcurrent) {
      const batch = queueItems.slice(i, i + maxConcurrent);
      const results = await Promise.all(
        batch.map((item: QueueItem) => processQueueItem(adminClient, item))
      );
      processedCount += results.length;
      failedCount += results.filter((ok: boolean) => !ok).length;
    }

    console.log(`Processed: ${processedCount}, Failed: ${failedCount}`);

    return new Response(
      JSON.stringify({ processed: processedCount, failed: failedCount, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Queue processor error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message, success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
