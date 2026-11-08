// Nome da sessão no OpenWA. Tem que ser único no servidor: com o nome amigável
// ("WhatsApp"), uma sessão órfã de tentativa anterior bloqueava a próxima com 409.
// O nome amigável continua em config.friendly_name.
export function openwaSessionName(tenantId: string, now = Date.now(), rand = Math.random()): string {
  const tenant = tenantId.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase() || "tenant";
  const suffix = Math.floor(rand * 36 ** 4).toString(36).padStart(4, "0");
  return `upixel-${tenant}-${now.toString(36)}${suffix}`;
}
