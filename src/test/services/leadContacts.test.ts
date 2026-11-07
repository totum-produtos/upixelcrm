import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockSupabase } from "../helpers/supabaseMock";

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase.client }));
vi.mock("@/lib/supabase-untyped", () => ({
  untypedFrom: (t: string) => mockSupabase.client.from(t),
  untypedRpc: (fn: string, a?: Record<string, unknown>) => mockSupabase.client.rpc(fn, a),
}));

import {
  getLeadContacts,
  getLeadContactsForLeads,
  createLeadContact,
  updateLeadContact,
  deleteLeadContact,
} from "@/services/leadContacts";

const UUID = "123e4567-e89b-12d3-a456-426614174000";

beforeEach(() => mockSupabase.reset());

describe("services/leadContacts", () => {
  it("getLeadContacts filtra por lead_id e ordena", async () => {
    mockSupabase.respond("lead_contacts", { data: [{ id: "k1" }] });
    expect(await getLeadContacts("l1")).toEqual([{ id: "k1" }]);
    const calls = mockSupabase.callsFor("lead_contacts");
    expect(calls).toContainEqual(["eq", "lead_id", "l1"]);
    expect(calls).toContainEqual(["order", "created_at", { ascending: true }]);
  });

  it("getLeadContacts propaga erro e devolve [] para data null", async () => {
    mockSupabase.respond("lead_contacts", { data: null });
    expect(await getLeadContacts("l1")).toEqual([]);
    mockSupabase.respond("lead_contacts", { error: new Error("boom") });
    await expect(getLeadContacts("l1")).rejects.toThrow("boom");
  });

  it("getLeadContactsForLeads retorna [] sem consultar quando lista vazia", async () => {
    expect(await getLeadContactsForLeads([])).toEqual([]);
    expect(mockSupabase.client.from).not.toHaveBeenCalled();
  });

  it("getLeadContactsForLeads usa in(lead_id) e propaga erro", async () => {
    mockSupabase.respond("lead_contacts", { data: [{ id: "k1" }] });
    expect(await getLeadContactsForLeads(["a", "b"])).toEqual([{ id: "k1" }]);
    expect(mockSupabase.callsFor("lead_contacts")).toContainEqual(["in", "lead_id", ["a", "b"]]);
    mockSupabase.respond("lead_contacts", { error: new Error("x") });
    await expect(getLeadContactsForLeads(["a"])).rejects.toThrow("x");
  });

  it("createLeadContact grava client_id e tenant_id valido", async () => {
    mockSupabase.respond("lead_contacts", { data: { id: "k1" } });
    const out = await createLeadContact({
      leadId: "l1", clientId: "c1", tenantId: UUID, name: "Ana", role: "decision_maker" as never,
      phone: "55", email: "a@b.c", notes: "n",
    });
    expect(out).toEqual({ id: "k1" });
    expect(mockSupabase.callsFor("lead_contacts")).toContainEqual([
      "insert",
      {
        lead_id: "l1", client_id: "c1", name: "Ana", role: "decision_maker",
        phone: "55", email: "a@b.c", notes: "n", tenant_id: UUID,
      },
    ]);
  });

  it("createLeadContact omite tenant_id invalido e normaliza opcionais vazios para null", async () => {
    await createLeadContact({
      leadId: "l1", clientId: "c1", tenantId: "master", name: "Ana", role: "other" as never, phone: "", email: "",
    });
    const insert = mockSupabase.callsFor("lead_contacts").find((c) => c[0] === "insert")?.[1] as Record<string, unknown>;
    expect(insert).not.toHaveProperty("tenant_id");
    expect(insert).toMatchObject({ phone: null, email: null, notes: null, client_id: "c1" });
  });

  it("createLeadContact propaga erro", async () => {
    mockSupabase.respond("lead_contacts", { error: new Error("dup") });
    await expect(
      createLeadContact({ leadId: "l1", clientId: "c1", name: "A", role: "other" as never })
    ).rejects.toThrow("dup");
  });

  it("updateLeadContact e deleteLeadContact usam eq(id) e propagam erro", async () => {
    await updateLeadContact("k1", { name: "Bia" });
    expect(mockSupabase.callsFor("lead_contacts")).toContainEqual(["update", { name: "Bia" }]);
    expect(mockSupabase.callsFor("lead_contacts")).toContainEqual(["eq", "id", "k1"]);
    mockSupabase.reset();
    await deleteLeadContact("k1");
    expect(mockSupabase.callsFor("lead_contacts")).toContainEqual(["delete"]);
    expect(mockSupabase.callsFor("lead_contacts")).toContainEqual(["eq", "id", "k1"]);
    mockSupabase.respond("lead_contacts", { error: new Error("x") });
    await expect(deleteLeadContact("k1")).rejects.toThrow("x");
    await expect(updateLeadContact("k1", {})).rejects.toThrow("x");
  });
});
