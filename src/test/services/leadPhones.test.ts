import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockSupabase } from "../helpers/supabaseMock";

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase.client }));
vi.mock("@/lib/supabase-untyped", () => ({
  untypedFrom: (t: string) => mockSupabase.client.from(t),
  untypedRpc: (fn: string, a?: Record<string, unknown>) => mockSupabase.client.rpc(fn, a),
}));

import {
  getLeadPhones,
  listLeadPhonesByClient,
  createLeadPhone,
  updateLeadPhone,
  deleteLeadPhone,
} from "@/services/leadPhones";

const UUID = "123e4567-e89b-12d3-a456-426614174000";

beforeEach(() => mockSupabase.reset());

describe("services/leadPhones", () => {
  it("getLeadPhones filtra por lead_id, ordena e devolve linhas", async () => {
    mockSupabase.respond("lead_phones", { data: [{ id: "p1" }] });
    expect(await getLeadPhones("l1")).toEqual([{ id: "p1" }]);
    const calls = mockSupabase.callsFor("lead_phones");
    expect(calls).toContainEqual(["eq", "lead_id", "l1"]);
    expect(calls).toContainEqual(["order", "created_at", { ascending: true }]);
  });

  it("getLeadPhones propaga erro e devolve [] para data null", async () => {
    mockSupabase.respond("lead_phones", { data: null });
    expect(await getLeadPhones("l1")).toEqual([]);
    mockSupabase.respond("lead_phones", { error: new Error("boom") });
    await expect(getLeadPhones("l1")).rejects.toThrow("boom");
  });

  it("listLeadPhonesByClient pagina ate receber pagina incompleta", async () => {
    const full = Array.from({ length: 1000 }, (_, i) => ({ lead_id: `l${i}`, number: "1", category: "mobile" }));
    const rest = [{ lead_id: "last", number: "2", category: "home" }];
    mockSupabase.respond("lead_phones", { data: full }, { data: rest });
    const rows = await listLeadPhonesByClient();
    expect(rows).toHaveLength(1001);
    expect(rows[1000].lead_id).toBe("last");
    const calls = mockSupabase.callsFor("lead_phones");
    expect(calls).toContainEqual(["range", 0, 999]);
    expect(calls).toContainEqual(["range", 1000, 1999]);
  });

  it("listLeadPhonesByClient para na primeira pagina vazia e propaga erro", async () => {
    mockSupabase.respond("lead_phones", { data: [] });
    expect(await listLeadPhonesByClient()).toEqual([]);
    expect(mockSupabase.queriesFor("lead_phones")).toHaveLength(1);
    mockSupabase.respond("lead_phones", { error: new Error("rls") });
    await expect(listLeadPhonesByClient()).rejects.toThrow("rls");
  });

  it("createLeadPhone grava client_id e tenant_id valido", async () => {
    mockSupabase.respond("lead_phones", { data: { id: "p1" } });
    const out = await createLeadPhone({
      leadId: "l1", clientId: "c1", tenantId: UUID, number: "5511", category: "mobile" as never, label: "Casa",
    });
    expect(out).toEqual({ id: "p1" });
    expect(mockSupabase.callsFor("lead_phones")).toContainEqual([
      "insert",
      { lead_id: "l1", client_id: "c1", number: "5511", category: "mobile", label: "Casa", tenant_id: UUID },
    ]);
  });

  it("createLeadPhone omite tenant_id invalido (master) e normaliza label vazio para null", async () => {
    await createLeadPhone({
      leadId: "l1", clientId: "c1", tenantId: "master", number: "5511", category: "mobile" as never, label: "",
    });
    const insert = mockSupabase.callsFor("lead_phones").find((c) => c[0] === "insert")?.[1] as Record<string, unknown>;
    expect(insert).not.toHaveProperty("tenant_id");
    expect(insert.label).toBeNull();
    expect(insert.client_id).toBe("c1");
  });

  it("createLeadPhone propaga erro", async () => {
    mockSupabase.respond("lead_phones", { error: new Error("dup") });
    await expect(
      createLeadPhone({ leadId: "l1", clientId: "c1", number: "1", category: "mobile" as never })
    ).rejects.toThrow("dup");
  });

  it("updateLeadPhone e deleteLeadPhone usam eq(id) e propagam erro", async () => {
    await updateLeadPhone("p1", { number: "99" });
    expect(mockSupabase.callsFor("lead_phones")).toContainEqual(["update", { number: "99" }]);
    expect(mockSupabase.callsFor("lead_phones")).toContainEqual(["eq", "id", "p1"]);
    mockSupabase.reset();
    await deleteLeadPhone("p1");
    expect(mockSupabase.callsFor("lead_phones")).toContainEqual(["delete"]);
    expect(mockSupabase.callsFor("lead_phones")).toContainEqual(["eq", "id", "p1"]);
    mockSupabase.respond("lead_phones", { error: new Error("x") });
    await expect(deleteLeadPhone("p1")).rejects.toThrow("x");
    await expect(updateLeadPhone("p1", {})).rejects.toThrow("x");
  });
});
