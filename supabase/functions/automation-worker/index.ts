import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

const MAX_RETRIES = 4;

function nextRetryAt(retryCount: number): string {
  const delayMs = Math.pow(2, retryCount) * 60 * 1000;
  return new Date(Date.now() + delayMs).toISOString();
}

function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const workerBearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const cronSecret = (Deno.env.get("CRON_SECRET") ?? "").trim();
  const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  const anonKey = (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();

  const authorized =
    (cronSecret && timingSafeEqual(workerBearer, cronSecret)) ||
    (serviceKey && timingSafeEqual(workerBearer, serviceKey));

  if (!authorized || (anonKey && timingSafeEqual(workerBearer, anonKey))) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 403,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    if (!supabaseUrl || !serviceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env");
      return new Response(JSON.stringify({ error: "missing_env", processed: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date().toISOString();

    // CB-04: atomic claim using UPDATE ... WHERE status='pending' RETURNING
    // to prevent duplicate execution when multiple callers poll.
    const { data: claimed, error: claimError } = await supabase
      .from("automation_queue")
      .update({ status: "processing" })
      .eq("status", "pending")
      .lte("scheduled_at", now)
      .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
      .limit(50)
      .select("*");

    if (claimError) {
      console.warn("Claim query failed, retrying without next_retry_at:", claimError.message);
      const res = await supabase
        .from("automation_queue")
        .update({ status: "processing" })
        .eq("status", "pending")
        .lte("scheduled_at", now)
        .limit(50)
        .select("*");
      if (res.error) {
        console.error("Fallback claim failed:", res.error.message);
        return new Response(JSON.stringify({ error: res.error.message, processed: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      if (!res.data || res.data.length === 0) {
        return new Response(JSON.stringify({ message: "No items to process", processed: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      // Continue with res.data
      const queueItems = res.data;
      const processed = [];

      for (const item of queueItems) {
        try {
          const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/automation-engine`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              tenant_id: item.tenant_id,
              automation_id: item.automation_id,
              lead_id: item.lead_id,
              node_id: item.node_id,
              context: item.context,
              run_id: (item.context as any)?._run_id ?? null,
            }),
          });

          if (!res.ok) {
            const err = await res.text();
            throw new Error(`Engine ${res.status}: ${err}`);
          }

          await supabase
            .from("automation_queue")
            .update({
              status: "completed",
              executed_at: new Date().toISOString(),
            })
            .eq("id", item.id);

          processed.push({ id: item.id, status: "success" });
        } catch (err: any) {
          const retryCount = (item.retry_count ?? 0) + 1;

          if (retryCount <= MAX_RETRIES) {
            await supabase
              .from("automation_queue")
              .update({
                status: "pending",
                retry_count: retryCount,
                next_retry_at: nextRetryAt(retryCount),
                error: err.message,
              })
              .eq("id", item.id);

            processed.push({
              id: item.id,
              status: "retrying",
              retry_count: retryCount,
              error: err.message,
            });
          } else {
            await supabase
              .from("automation_queue")
              .update({
                status: "failed",
                error: `Max retries (${MAX_RETRIES}) exceeded. Last: ${err.message}`,
              })
              .eq("id", item.id);

            processed.push({ id: item.id, status: "failed", error: err.message });
          }
        }
      }

      return new Response(JSON.stringify({ processed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!claimed || claimed.length === 0) {
      return new Response(JSON.stringify({ message: "No items to process", processed: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const processed = [];

    for (const item of claimed) {
      try {
        const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/automation-engine`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            tenant_id: item.tenant_id,
            automation_id: item.automation_id,
            lead_id: item.lead_id,
            node_id: item.node_id,
            context: item.context,
            run_id: (item.context as any)?._run_id ?? null,
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Engine ${res.status}: ${err}`);
        }

        await supabase
          .from("automation_queue")
          .update({
            status: "completed",
            executed_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        processed.push({ id: item.id, status: "success" });
      } catch (err: any) {
        const retryCount = (item.retry_count ?? 0) + 1;

        if (retryCount <= MAX_RETRIES) {
          await supabase
            .from("automation_queue")
            .update({
              status: "pending",
              retry_count: retryCount,
              next_retry_at: nextRetryAt(retryCount),
              error: err.message,
            })
            .eq("id", item.id);

          processed.push({
            id: item.id,
            status: "retrying",
            retry_count: retryCount,
            error: err.message,
          });
        } else {
          await supabase
            .from("automation_queue")
            .update({
              status: "failed",
              error: `Max retries (${MAX_RETRIES}) exceeded. Last: ${err.message}`,
            })
            .eq("id", item.id);

          processed.push({ id: item.id, status: "failed", error: err.message });
        }
      }
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Worker Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
