import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockSupabase } from "../helpers/supabaseMock";

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase.client }));
vi.mock("@/lib/supabase-untyped", () => ({
  untypedFrom: (t: string) => mockSupabase.client.from(t),
  untypedRpc: (fn: string, a?: Record<string, unknown>) => mockSupabase.client.rpc(fn, a),
}));
const invokeEdge = vi.fn();
vi.mock("@/lib/edge-invoke", () => ({ invokeEdge: (...a: unknown[]) => invokeEdge(...a) }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  listIntegrations,
  insertIntegration,
  updateIntegration,
  deleteIntegration,
  listIntegrationsByProviders,
  listIntegrationStatuses,
  updateIntegrationStatusByProviders,
  masterListTenantsAndIntegrations,
  listAdCampaigns,
  listApiKeys,
  deactivateApiKey,
  invokeWhatsAppProxy,
  invokeMetaAds,
  invokeGoogleAds,
} from "@/services/integrations";

beforeEach(() => {
  mockSupabase.reset();
  invokeEdge.mockReset();
});

describe("services/integrations - integrations", () => {
  it("listIntegrations filtra por client_id e provider", async () => {
    mockSupabase.respond("integrations", { data: [{ id: "i1" }] });
    expect(await listIntegrations("t-1", "whatsapp")).toEqual([{ id: "i1" }]);
    const calls = mockSupabase.callsFor("integrations");
    expect(calls).toContainEqual(["eq", "client_id", "t-1"]);
    expect(calls).toContainEqual(["eq", "provider", "whatsapp"]);
  });

  it("listIntegrations devolve [] quando data e null e propaga erro", async () => {
    expect(await listIntegrations("t-1", "x")).toEqual([]);
    mockSupabase.respond("integrations", { error: new Error("boom") });
    await expect(listIntegrations("t-1", "x")).rejects.toThrow("boom");
  });

  it("insertIntegration envia a linha (com client_id) e devolve o registro criado", async () => {
    mockSupabase.respond("integrations", { data: { id: "new" } });
    const row = { client_id: "t-1", provider: "meta" } as never;
    expect(await insertIntegration(row)).toEqual({ id: "new" });
    expect(mockSupabase.callsFor("integrations")).toContainEqual(["insert", row]);
  });

  it("insertIntegration propaga erro", async () => {
    mockSupabase.respond("integrations", { error: new Error("dup") });
    await expect(insertIntegration({} as never)).rejects.toThrow("dup");
  });

  it("updateIntegration carimba updated_at e filtra por id", async () => {
    await updateIntegration("i1", { status: "active" } as never);
    const calls = mockSupabase.callsFor("integrations");
    const upd = calls.find((c) => c[0] === "update");
    expect(upd?.[1]).toMatchObject({ status: "active" });
    expect(typeof (upd?.[1] as { updated_at: string }).updated_at).toBe("string");
    expect(calls).toContainEqual(["eq", "id", "i1"]);
  });

  it("updateIntegration e deleteIntegration propagam erro", async () => {
    mockSupabase.respond("integrations", { error: new Error("rls") });
    await expect(updateIntegration("i1", {})).rejects.toThrow("rls");
    await expect(deleteIntegration("i1")).rejects.toThrow("rls");
  });

  it("deleteIntegration deleta por id", async () => {
    await deleteIntegration("i9");
    const calls = mockSupabase.callsFor("integrations");
    expect(calls.map((c) => c[0])).toContain("delete");
    expect(calls).toContainEqual(["eq", "id", "i9"]);
  });

  it("listIntegrationsByProviders filtra tenant e providers", async () => {
    mockSupabase.respond("integrations", { data: [{ id: "1", provider: "openai", config: {} }] });
    const rows = await listIntegrationsByProviders("t-1", ["openai", "gemini"]);
    expect(rows).toHaveLength(1);
    const calls = mockSupabase.callsFor("integrations");
    expect(calls).toContainEqual(["eq", "client_id", "t-1"]);
    expect(calls).toContainEqual(["in", "provider", ["openai", "gemini"]]);
  });

  it("listIntegrationsByProviders propaga erro", async () => {
    mockSupabase.respond("integrations", { error: new Error("x") });
    await expect(listIntegrationsByProviders("t-1", ["a"])).rejects.toThrow("x");
  });

  it("listIntegrationStatuses filtra por tenant e engole erro devolvendo []", async () => {
    mockSupabase.respond("integrations", { error: new Error("x"), data: null });
    expect(await listIntegrationStatuses("t-1")).toEqual([]);
    expect(mockSupabase.callsFor("integrations")).toContainEqual(["eq", "client_id", "t-1"]);
  });

  it("updateIntegrationStatusByProviders escopa por client_id e providers", async () => {
    await updateIntegrationStatusByProviders("t-1", ["meta", "google"], "inactive");
    const calls = mockSupabase.callsFor("integrations");
    expect(calls).toContainEqual(["update", { status: "inactive" }]);
    expect(calls).toContainEqual(["eq", "client_id", "t-1"]);
    expect(calls).toContainEqual(["in", "provider", ["meta", "google"]]);
  });

  it("updateIntegrationStatusByProviders propaga erro", async () => {
    mockSupabase.respond("integrations", { error: new Error("nope") });
    await expect(updateIntegrationStatusByProviders("t-1", ["a"], "x")).rejects.toThrow("nope");
  });
});

describe("services/integrations - visao master", () => {
  it("masterListTenantsAndIntegrations devolve tenants e integrations sem filtro de tenant", async () => {
    mockSupabase.respond("tenants", { data: [{ id: "t1", name: "A", subdomain: "a" }] });
    mockSupabase.respond("integrations", { data: [{ id: "i1" }] });
    const r = await masterListTenantsAndIntegrations();
    expect(r.tenants).toHaveLength(1);
    expect(r.integrations).toEqual([{ id: "i1" }]);
    const filters = [...mockSupabase.callsFor("tenants"), ...mockSupabase.callsFor("integrations")].filter(
      (c) => c[0] === "eq",
    );
    expect(filters).toEqual([]);
  });

  it("masterListTenantsAndIntegrations tolera erro devolvendo listas vazias", async () => {
    mockSupabase.respond("tenants", { error: new Error("x") });
    mockSupabase.respond("integrations", { error: new Error("y") });
    expect(await masterListTenantsAndIntegrations()).toEqual({ tenants: [], integrations: [] });
  });
});

describe("services/integrations - ad_campaigns / api_keys", () => {
  it("listAdCampaigns filtra client_id e platform", async () => {
    mockSupabase.respond("ad_campaigns", { data: [{ id: "c1" }] });
    expect(await listAdCampaigns("t-1", "meta")).toEqual([{ id: "c1" }]);
    const calls = mockSupabase.callsFor("ad_campaigns");
    expect(calls).toContainEqual(["eq", "client_id", "t-1"]);
    expect(calls).toContainEqual(["eq", "platform", "meta"]);
  });

  it("listAdCampaigns devolve [] em erro (tabela inexistente)", async () => {
    mockSupabase.respond("ad_campaigns", { error: { message: "404" } });
    expect(await listAdCampaigns("t-1", "google")).toEqual([]);
  });

  it("listApiKeys propaga erro e devolve [] com data nulo", async () => {
    expect(await listApiKeys()).toEqual([]);
    mockSupabase.respond("api_keys", { error: new Error("denied") });
    await expect(listApiKeys()).rejects.toThrow("denied");
  });

  it("deactivateApiKey marca active=false por id", async () => {
    await deactivateApiKey("k1");
    const calls = mockSupabase.callsFor("api_keys");
    expect(calls).toContainEqual(["update", { active: false }]);
    expect(calls).toContainEqual(["eq", "id", "k1"]);
  });
});

describe("services/integrations - edge functions", () => {
  it("invokeWhatsAppProxy monta a query string e envia body", async () => {
    invokeEdge.mockResolvedValue({ data: { ok: 1 }, error: null });
    const r = await invokeWhatsAppProxy("send", { type: "normal", instanceName: "inst" }, { a: 1 });
    expect(r).toEqual({ ok: 1 });
    expect(invokeEdge).toHaveBeenCalledWith(
      "whatsapp-proxy?action=send&type=normal&instance_name=inst",
      { body: { a: 1 } },
    );
  });

  it("invokeWhatsAppProxy sem instanceName/body e erro sem message", async () => {
    invokeEdge.mockResolvedValueOnce({ data: null, error: null });
    await invokeWhatsAppProxy("status", { type: "official" });
    expect(invokeEdge).toHaveBeenCalledWith("whatsapp-proxy?action=status&type=official", undefined);
    invokeEdge.mockResolvedValueOnce({ data: null, error: { message: "" } });
    await expect(invokeWhatsAppProxy("x", { type: "official" })).rejects.toThrow("Request failed");
  });

  it("invokeMetaAds e invokeGoogleAds devolvem data e propagam o erro original", async () => {
    invokeEdge.mockResolvedValueOnce({ data: [1], error: null });
    expect(await invokeMetaAds("campaigns")).toEqual([1]);
    expect(invokeEdge).toHaveBeenLastCalledWith("meta-ads?action=campaigns", undefined);
    const err = new Error("g");
    invokeEdge.mockResolvedValueOnce({ data: null, error: err });
    await expect(invokeGoogleAds("sync", { x: 1 })).rejects.toBe(err);
    expect(invokeEdge).toHaveBeenLastCalledWith("google-ads?action=sync", { body: { x: 1 } });
  });
});
