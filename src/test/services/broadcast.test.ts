import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockSupabase } from "../helpers/supabaseMock";

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase.client }));
vi.mock("@/lib/supabase-untyped", () => ({
  untypedFrom: (t: string) => mockSupabase.client.from(t),
  untypedRpc: (fn: string, a?: Record<string, unknown>) => mockSupabase.client.rpc(fn, a),
}));

import {
  listWhatsAppTemplates,
  listApprovedWhatsAppTemplates,
  getClientCredits,
} from "@/services/broadcast";

beforeEach(() => mockSupabase.reset());

describe("services/broadcast", () => {
  it("listWhatsAppTemplates filtra pelo tenant e devolve as linhas", async () => {
    mockSupabase.respond("whatsapp_templates", { data: [{ id: "1", name: "oi" }] });
    const rows = await listWhatsAppTemplates("t-1");
    expect(rows).toEqual([{ id: "1", name: "oi" }]);
    expect(mockSupabase.callsFor("whatsapp_templates")).toContainEqual(["eq", "client_id", "t-1"]);
  });

  it("listWhatsAppTemplates propaga erro do banco", async () => {
    mockSupabase.respond("whatsapp_templates", { error: new Error("boom") });
    await expect(listWhatsAppTemplates("t-1")).rejects.toThrow("boom");
  });

  it("listApprovedWhatsAppTemplates devolve [] em erro e filtra APPROVED", async () => {
    mockSupabase.respond("whatsapp_templates", { error: new Error("x") });
    expect(await listApprovedWhatsAppTemplates("t-1")).toEqual([]);
    expect(mockSupabase.callsFor("whatsapp_templates")).toContainEqual(["eq", "status", "APPROVED"]);
  });

  it("getClientCredits lê balance do config e cai para 0", async () => {
    mockSupabase.respond("integrations", { data: { config: { balance: 42 } } }, { data: null });
    expect(await getClientCredits("t-1")).toBe(42);
    expect(await getClientCredits("t-1")).toBe(0);
    expect(mockSupabase.callsFor("integrations")).toContainEqual(["eq", "client_id", "t-1"]);
  });
});
