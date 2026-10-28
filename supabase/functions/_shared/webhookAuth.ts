// Shared webhook auth helper for non-official WhatsApp webhooks
// Uses constant-time comparison to avoid timing attacks

function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyIntegrationWebhookToken(
  adminClient: any,
  integrationId: string | null,
  token: string | null,
): Promise<{ ok: boolean; match?: any; reason?: string }> {
  if (!integrationId || !token) {
    return { ok: false, reason: "missing_integration_id_or_token" };
  }

  // Only allow safe integration IDs
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(integrationId)) {
    return { ok: false, reason: "invalid_integration_id" };
  }

  const { data, error } = await adminClient
    .from("integrations")
    .select("id, client_id, status, config, provider")
    .eq("id", integrationId)
    .eq("provider", "whatsapp")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, reason: "integration_not_found" };
  }

  const cfg = (data.config || {}) as Record<string, any>;
  const expected = cfg.webhook_token || cfg.webhook_secret || cfg.token;

  if (!expected || typeof expected !== "string") {
    return { ok: false, reason: "webhook_token_not_configured" };
  }

  if (!timingSafeEqual(token, expected)) {
    return { ok: false, reason: "invalid_token" };
  }

  return { ok: true, match: data };
}

export function extractWebhookToken(req: Request): string | null {
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("webhook_token") || url.searchParams.get("token") || url.searchParams.get("apikey");
  if (fromQuery) return fromQuery;
  const fromHeader = req.headers.get("x-webhook-token") || req.headers.get("x-api-key") || req.headers.get("apikey");
  if (fromHeader) return fromHeader;
  return null;
}

export function isValidInstanceName(name: unknown): name is string {
  return typeof name === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(name);
}

export function isValidSessionId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(id);
}
