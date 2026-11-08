// Verificação de JWT HS256 do roteador self-hosted. Só Web Crypto, sem dependência
// remota (o edge-runtime não precisa baixar nada no boot). Testado em
// src/test/edge/selfhosted-router-auth.test.ts.

// Espelha `verify_jwt = false` do supabase/config.toml: webhooks chamados por
// terceiros (Meta, Asaas, OpenWA) sem JWT do Supabase. O teste falha se divergir.
export const PUBLIC_FUNCTIONS = new Set([
  "asaas-webhook",
  "data-deletion-callback",
  "facebook-messenger-webhook",
  "instagram-webhook",
  "meta-leads-webhook",
  "whatsapp-cloud-webhook",
  "whatsapp-webhook",
]);

const FUNCTION_NAME = /^[a-z0-9][a-z0-9-]*$/;

/** Nome da function a partir do path que o Kong entrega (/functions/v1 já removido). */
export function functionName(pathname: string): string | null {
  const name = pathname.split("/")[1] ?? "";
  return FUNCTION_NAME.test(name) ? name : null;
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** true só para JWT HS256 assinado com `secret` e não expirado. */
export async function verifyJwt(token: string, secret: string, nowSec = Date.now() / 1000): Promise<boolean> {
  if (!secret) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
    if (header.alg !== "HS256") return false;
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
    );
    const ok = await crypto.subtle.verify(
      "HMAC", key, b64urlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    if (!ok) return false;
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
    return typeof payload.exp !== "number" || payload.exp > nowSec;
  } catch {
    return false;
  }
}
