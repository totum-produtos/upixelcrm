// Regra pura de autenticação do send-push. Sem imports de Deno para ser
// testada no vitest (src/test/edge/send-push-access.test.ts).

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * SEC-1 / A-01: whatsapp-webhook e instagram-webhook chamam o send-push com
 * `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`. A service role não é um
 * usuário, então `auth.getUser()` falhava, a função respondia 401 e o push de
 * mensagem nova nunca era enviado (e o webhook não logava o erro).
 *
 * Chamada interna = bearer idêntico à service role key configurada no projeto.
 */
export function isInternalServiceCall(authHeader: string | null, serviceRoleKey: string | undefined): boolean {
  if (!authHeader?.startsWith("Bearer ") || !serviceRoleKey) return false;
  return timingSafeEqual(authHeader.slice("Bearer ".length), serviceRoleKey);
}
