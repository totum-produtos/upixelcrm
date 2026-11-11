// Nome da sessão no OpenWA. Tem que ser único no servidor: com o nome amigável
// ("WhatsApp"), uma sessão órfã de tentativa anterior bloqueava a próxima com 409.
// O nome amigável continua em config.friendly_name.
export function openwaSessionName(tenantId: string, now = Date.now(), rand = Math.random()): string {
  const tenant = tenantId.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase() || "tenant";
  const suffix = Math.floor(rand * 36 ** 4).toString(36).padStart(4, "0");
  return `upixel-${tenant}-${now.toString(36)}${suffix}`;
}

// O OpenWA só tem QR depois que o motor carrega (alguns segundos após o /start).
// Pedir uma vez só, logo após o start, devolvia vazio e o modal ficava sem QR.
export async function pollQr(
  fetchQr: () => Promise<string | null>,
  tries = 10,
  delayMs = 1500,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<string | null> {
  for (let i = 0; i < tries; i++) {
    const qr = await fetchQr().catch(() => null);
    if (qr) return qr;
    if (i < tries - 1) await sleep(delayMs);
  }
  return null;
}

// Sessão VINCULADA: uma sessão OpenWA que já existia e pertence a outro sistema
// (ex.: a "claudia" do Hermes), ligada ao CRM sem QR. O CRM nunca pode apagar,
// parar ou recriar essa sessão: desconectar/remover só desfaz o vínculo do CRM.
export function isLinkedSession(config: Record<string, unknown> | null | undefined): boolean {
  return config?.linked === true;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

// Remove do OpenWA apenas os webhooks desta integração (mesma URL). Os webhooks
// de outros sistemas na mesma sessão ficam intactos. Nunca lança.
export async function removeOpenWAWebhook(
  apiUrl: string,
  headers: Record<string, string>,
  sessionId: string,
  webhookUrl: string,
  fetchFn: FetchLike = fetch,
): Promise<{ removed: number; error?: string }> {
  const base = `${apiUrl}/api/sessions/${encodeURIComponent(sessionId)}/webhooks`;
  try {
    const listRes = await fetchFn(base, { headers });
    if (!listRes.ok) return { removed: 0, error: `HTTP ${listRes.status} ao listar webhooks` };
    const list = await listRes.json().catch(() => null);
    const items: Array<{ id?: string; url?: string }> = Array.isArray(list)
      ? list
      : Array.isArray(list?.data) ? list.data : [];
    let removed = 0;
    for (const w of items) {
      if (w?.url !== webhookUrl || !w.id) continue;
      const res = await fetchFn(`${base}/${encodeURIComponent(w.id)}`, { method: "DELETE", headers });
      if (res.ok) removed++;
    }
    return { removed };
  } catch (e) {
    return { removed: 0, error: e instanceof Error ? e.message : String(e) };
  }
}
