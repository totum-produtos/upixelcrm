// WhatsApp Status Probe: status de saúde de UMA integração WhatsApp.
//
// v4 (SEC-2 / A-02): exige JWT de usuário e só responde sobre integrações do
// tenant do chamador (master vê todas). Antes, qualquer JWT válido de qualquer
// tenant lia o status de qualquer integração pelo UUID, porque a função usa
// service role e não checava o dono. Não é endpoint público: NÃO adicionar
// verify_jwt = false em config.toml.
//
// Integração inexistente e integração de outro tenant devolvem a mesma resposta
// (503 "Integration not found"), para não virar oráculo de enumeração de UUID.
//
// Uso:
//   GET /functions/v1/whatsapp-status-probe?integration_id=<uuid>
//   Authorization: Bearer <jwt do usuário>
//
// Retorna 200 + status=healthy quando a integração estiver "connected" e
// health_status != "unhealthy". Caso contrário 503.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, limitFromEnv, tooManyRequests } from "../_shared/rateLimit.ts";
import { canAccessTenant, type CallerProfile } from "./access.ts";

const FAILURE_THRESHOLD = 3;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const JSON_HEADERS = { "Content-Type": "application/json" };

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function notFound(): Response {
  return json({ status: "error", message: "Integration not found", timestamp: new Date().toISOString() }, 503);
}

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const integrationId = url.searchParams.get("integration_id");
    if (!integrationId) {
      return json({ status: "error", message: "integration_id query param is required" }, 400);
    }
    if (!UUID_RE.test(integrationId)) {
      return json({ status: "error", message: "Invalid integration_id format" }, 400);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ status: "error", message: "Unauthorized" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ status: "error", message: "Unauthorized" }, 401);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const rl = await checkRateLimit(
      admin,
      `whatsapp-status-probe:${user.id}`,
      limitFromEnv("STATUS_PROBE_RATE_LIMIT", 60),
      60,
    );
    if (!rl.allowed) return tooManyRequests(JSON_HEADERS, 60);

    const { data: profile } = await admin
      .from("profiles")
      .select("role, tenant_id, client_id, approval_status, is_blocked")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile) return notFound();

    const { data, error } = await admin
      .from("integrations")
      .select("id, client_id, provider, status, health_status, consecutive_failures, updated_at")
      .eq("id", integrationId)
      .maybeSingle();

    if (error || !data || !canAccessTenant(profile as CallerProfile, data.client_id)) {
      return notFound();
    }

    const isUnhealthy =
      data.health_status === "unhealthy" ||
      data.status !== "connected" ||
      data.consecutive_failures >= FAILURE_THRESHOLD;

    return json({
      status: isUnhealthy ? "unhealthy" : "healthy",
      provider: data.provider,
      integration_status: data.status,
      health_status: data.health_status,
      consecutive_failures: data.consecutive_failures,
      last_updated: data.updated_at,
      timestamp: new Date().toISOString(),
    }, isUnhealthy ? 503 : 200);
  } catch (err) {
    console.error("[whatsapp-status-probe] erro:", err);
    return json({ status: "error", message: "internal_error", timestamp: new Date().toISOString() }, 503);
  }
});
