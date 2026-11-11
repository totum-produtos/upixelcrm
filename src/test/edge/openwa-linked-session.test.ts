import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isLinkedSession, removeOpenWAWebhook } from "../../../supabase/functions/whatsapp-proxy/openwa-session";

describe("isLinkedSession", () => {
  it("só é vinculada com linked === true", () => {
    expect(isLinkedSession({ linked: true })).toBe(true);
    expect(isLinkedSession({ linked: "true" })).toBe(false);
    expect(isLinkedSession({})).toBe(false);
    expect(isLinkedSession(null)).toBe(false);
  });
});

describe("removeOpenWAWebhook", () => {
  const api = "https://wa.example";
  const mine = "https://crm.example/functions/v1/whatsapp-webhook?integration_id=abc";
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

  it("apaga só o webhook do CRM e preserva o dos outros sistemas", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    const fetchFn = async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method ?? "GET" });
      if (!init?.method) return json({ data: [{ id: "w1", url: "https://hermes.example/hook" }, { id: "w2", url: mine }] });
      return new Response(null, { status: 204 });
    };
    const r = await removeOpenWAWebhook(api, {}, "sess 1", mine, fetchFn);
    expect(r).toEqual({ removed: 1 });
    const deletes = calls.filter((c) => c.method === "DELETE");
    expect(deletes).toEqual([{ url: `${api}/api/sessions/sess%201/webhooks/w2`, method: "DELETE" }]);
    expect(calls.some((c) => c.method === "DELETE" && !c.url.includes("/webhooks/"))).toBe(false);
  });

  it("não lança quando o servidor falha", async () => {
    const r = await removeOpenWAWebhook(api, {}, "s", mine, async () => { throw new Error("rede"); });
    expect(r.removed).toBe(0);
    expect(r.error).toBe("rede");
    const r2 = await removeOpenWAWebhook(api, {}, "s", mine, async () => json({}, 500));
    expect(r2.error).toMatch(/500/);
  });
});

// Guarda de regressão: desconectar/remover uma sessão vinculada nunca pode chegar
// no DELETE /api/sessions/{id} (isso derrubaria o número no outro sistema).
describe("whatsapp-proxy respeita sessão vinculada", () => {
  const src = readFileSync(resolve(__dirname, "../../../supabase/functions/whatsapp-proxy/index.ts"), "utf8");
  const block = (action: string) => {
    const start = src.indexOf(`if (action === "${action}") {\n      try {`);
    expect(start).toBeGreaterThan(-1);
    return src.slice(start, start + 900);
  };
  it.each(["delete-instance", "disconnect"])("%s trata linked antes de apagar a sessão", (action) => {
    const b = block(action);
    const linkedAt = b.indexOf("isOpenWA && linked");
    const deleteAt = b.indexOf("/api/sessions/${instancePath}`");
    expect(linkedAt).toBeGreaterThan(-1);
    expect(deleteAt).toBeGreaterThan(linkedAt);
    expect(b.slice(linkedAt, deleteAt)).toContain("removeOpenWAWebhook");
  });
  it("connect não recria nem dá start em sessão vinculada", () => {
    expect(src).toContain("checkRes.status === 404 && linked");
    expect(src).toMatch(/if \(!linked\) \{\s*await fetch\(`\$\{config\.api_url\}\/api\/sessions\/\$\{sessionPath\}\/start`/);
  });
});
