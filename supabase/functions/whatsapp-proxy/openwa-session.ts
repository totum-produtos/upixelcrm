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
