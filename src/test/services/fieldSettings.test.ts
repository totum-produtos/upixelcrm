import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockSupabase } from "../helpers/supabaseMock";

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase.client }));
vi.mock("@/lib/supabase-untyped", () => ({
  untypedFrom: (t: string) => mockSupabase.client.from(t),
  untypedRpc: (fn: string, a?: Record<string, unknown>) => mockSupabase.client.rpc(fn, a),
}));

import { getFieldSettings, saveFieldSettings, DEFAULT_FIELD_CONFIG } from "@/services/fieldSettings";

const UUID = "123e4567-e89b-12d3-a456-426614174000";
const T = "client_field_settings";

beforeEach(() => mockSupabase.reset());

function upsertPayload() {
  const c = mockSupabase.callsFor(T).find((x) => x[0] === "upsert");
  return c as [string, Record<string, unknown>, Record<string, unknown>] | undefined;
}

describe("services/fieldSettings", () => {
  it("getFieldSettings filtra por client_id", async () => {
    mockSupabase.respond(T, { data: { field_config: DEFAULT_FIELD_CONFIG } });
    await getFieldSettings("c-1");
    expect(mockSupabase.callsFor(T)).toContainEqual(["eq", "client_id", "c-1"]);
  });

  it("devolve a config salva sem upsert quando ja tem todas as keys", async () => {
    const saved = DEFAULT_FIELD_CONFIG.map((f) => ({ ...f, enabled: !f.enabled }));
    mockSupabase.respond(T, { data: { field_config: saved } });
    expect(await getFieldSettings("c-1")).toEqual(saved);
    expect(upsertPayload()).toBeUndefined();
  });

  it("completa keys ausentes (segmento/origin) sem alterar o que o tenant escolheu", async () => {
    const saved = [{ key: "state", label: "UF", enabled: false, order: 1 }];
    mockSupabase.respond(T, { data: { field_config: saved } });
    const r = await getFieldSettings("c-1");
    expect(r[0]).toEqual(saved[0]);
    expect(r).toHaveLength(DEFAULT_FIELD_CONFIG.length);
    expect(r.map((f) => f.key)).toEqual(DEFAULT_FIELD_CONFIG.map((f) => f.key));
  });

  it("sem registro, cria defaults via upsert com client_id e tenant_id valido", async () => {
    mockSupabase.respond(T, { data: null });
    const r = await getFieldSettings("c-1", UUID);
    expect(r).toEqual(DEFAULT_FIELD_CONFIG);
    const up = upsertPayload();
    expect(up?.[1]).toMatchObject({ client_id: "c-1", tenant_id: UUID, field_config: DEFAULT_FIELD_CONFIG });
    expect(up?.[2]).toEqual({ onConflict: "client_id" });
  });

  it("omite tenant_id no upsert quando e sentinela 'master' ou nulo", async () => {
    mockSupabase.respond(T, { data: null });
    await getFieldSettings("c-1", "master");
    expect(upsertPayload()?.[1]).not.toHaveProperty("tenant_id");
    mockSupabase.reset();
    mockSupabase.respond(T, { data: null });
    await getFieldSettings("c-1", null);
    expect(upsertPayload()?.[1]).not.toHaveProperty("tenant_id");
  });

  it("propaga erro de leitura sem tentar upsert", async () => {
    mockSupabase.respond(T, { error: new Error("read") });
    await expect(getFieldSettings("c-1")).rejects.toThrow("read");
    expect(upsertPayload()).toBeUndefined();
  });

  it("propaga erro do upsert de defaults", async () => {
    mockSupabase.respond(T, { data: null }, { error: new Error("up") });
    await expect(getFieldSettings("c-1")).rejects.toThrow("up");
  });

  it("saveFieldSettings faz upsert por client_id com a config", async () => {
    const cfg = [{ key: "city", label: "Cidade", enabled: true, order: 1 }];
    await saveFieldSettings("c-2", cfg as never, UUID);
    const up = upsertPayload();
    expect(up?.[1]).toEqual({ client_id: "c-2", field_config: cfg, tenant_id: UUID });
    expect(up?.[2]).toEqual({ onConflict: "client_id" });
  });

  it("saveFieldSettings propaga erro", async () => {
    mockSupabase.respond(T, { error: new Error("fail") });
    await expect(saveFieldSettings("c-2", [])).rejects.toThrow("fail");
  });
});
