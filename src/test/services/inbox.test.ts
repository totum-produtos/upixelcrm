import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockSupabase } from "../helpers/supabaseMock";

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase.client }));
vi.mock("@/lib/supabase-untyped", () => ({
  untypedFrom: (t: string) => mockSupabase.client.from(t),
  untypedRpc: (fn: string, a?: Record<string, unknown>) => mockSupabase.client.rpc(fn, a),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import {
  reawakenExpiredSnoozes,
  listConversations,
  listLeadBasicsByIds,
  listLeadConversationRefs,
  listMessagesByConversationIds,
  MESSAGE_PAGE_SIZE,
  getConversationRef,
  insertConversation,
  updateConversationsStatus,
  updateConversationMetadata,
  listInboxTemplates,
  createInboxTemplate,
  listMacros,
  listPendingCsatConversations,
  markCsatSent,
  countOpenUnreadConversations,
  countPendingTasks,
  markConversationsRead,
  reassignConversationsToLead,
  markConversationsUnread,
  insertMessage,
} from "@/services/inbox";
import { logger } from "@/lib/logger";

beforeEach(() => {
  mockSupabase.reset();
  vi.mocked(logger.error).mockClear();
});

describe("services/inbox - conversas", () => {
  it("reawakenExpiredSnoozes filtra por client_id e status snoozed e reabre", async () => {
    await reawakenExpiredSnoozes("t-1");
    const calls = mockSupabase.callsFor("conversations");
    expect(calls).toContainEqual(["update", { status: "open", snoozed_until: null }]);
    expect(calls).toContainEqual(["eq", "client_id", "t-1"]);
    expect(calls).toContainEqual(["eq", "status", "snoozed"]);
    expect(calls.some((c) => c[0] === "lte" && c[1] === "snoozed_until")).toBe(true);
  });

  it("reawakenExpiredSnoozes engole o erro (apenas loga)", async () => {
    mockSupabase.respond("conversations", { error: new Error("db down") });
    await expect(reawakenExpiredSnoozes("t-1")).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });

  it("listConversations filtra por tenant, ordena e limita a 1000", async () => {
    mockSupabase.respond("conversations", { data: [{ id: "c1" }] });
    expect(await listConversations("t-1")).toEqual([{ id: "c1" }]);
    const calls = mockSupabase.callsFor("conversations");
    expect(calls).toContainEqual(["eq", "client_id", "t-1"]);
    expect(calls).toContainEqual(["order", "last_message_at", { ascending: false }]);
    expect(calls).toContainEqual(["limit", 1000]);
  });

  it("listConversations propaga erro e devolve [] se data for null", async () => {
    mockSupabase.respond("conversations", { error: new Error("boom") });
    await expect(listConversations("t-1")).rejects.toThrow("boom");
    mockSupabase.respond("conversations", { data: null });
    expect(await listConversations("t-1")).toEqual([]);
  });

  it("listLeadBasicsByIds retorna [] sem consultar quando ids vazio", async () => {
    expect(await listLeadBasicsByIds([])).toEqual([]);
    expect(mockSupabase.client.from).not.toHaveBeenCalled();
  });

  it("listLeadBasicsByIds usa in(id) e propaga erro", async () => {
    mockSupabase.respond("leads", { data: [{ id: "l1" }] });
    expect(await listLeadBasicsByIds(["l1", "l2"])).toEqual([{ id: "l1" }]);
    expect(mockSupabase.callsFor("leads")).toContainEqual(["in", "id", ["l1", "l2"]]);
    mockSupabase.respond("leads", { error: new Error("x") });
    await expect(listLeadBasicsByIds(["l1"])).rejects.toThrow("x");
  });

  it("listLeadConversationRefs filtra por client_id e lead_id", async () => {
    mockSupabase.respond("conversations", { data: [{ id: "c1", channel: "whatsapp" }] });
    const rows = await listLeadConversationRefs("t-1", "lead-9");
    expect(rows).toEqual([{ id: "c1", channel: "whatsapp" }]);
    const calls = mockSupabase.callsFor("conversations");
    expect(calls).toContainEqual(["eq", "client_id", "t-1"]);
    expect(calls).toContainEqual(["eq", "lead_id", "lead-9"]);
  });

  it("listLeadConversationRefs com 'unassigned' usa is(lead_id, null) mantendo o tenant", async () => {
    await listLeadConversationRefs("t-1", "unassigned");
    const calls = mockSupabase.callsFor("conversations");
    expect(calls).toContainEqual(["is", "lead_id", null]);
    expect(calls).toContainEqual(["eq", "client_id", "t-1"]);
    expect(calls.some((c) => c[0] === "eq" && c[1] === "lead_id")).toBe(false);
  });

  it("getConversationRef filtra por id E client_id e devolve null se ausente", async () => {
    mockSupabase.respond("conversations", { data: { lead_id: "l1", channel: "email" } }, { data: null });
    expect(await getConversationRef("c1", "t-1")).toEqual({ lead_id: "l1", channel: "email" });
    expect(await getConversationRef("c1", "t-1")).toBeNull();
    const calls = mockSupabase.callsFor("conversations");
    expect(calls).toContainEqual(["eq", "id", "c1"]);
    expect(calls).toContainEqual(["eq", "client_id", "t-1"]);
  });

  it("getConversationRef propaga erro", async () => {
    mockSupabase.respond("conversations", { error: new Error("rls") });
    await expect(getConversationRef("c1", "t-1")).rejects.toThrow("rls");
  });

  it("insertConversation devolve o id criado e propaga erro", async () => {
    mockSupabase.respond("conversations", { data: { id: "new" } });
    const row = { client_id: "t-1", channel: "whatsapp" } as never;
    expect(await insertConversation(row)).toEqual({ id: "new" });
    expect(mockSupabase.callsFor("conversations")).toContainEqual(["insert", row]);
    mockSupabase.respond("conversations", { error: new Error("dup") });
    await expect(insertConversation(row)).rejects.toThrow("dup");
  });

  it("updateConversationsStatus inclui snoozed_until só quando informado", async () => {
    await updateConversationsStatus(["c1", "c2"], "closed", "t-1");
    const first = mockSupabase.callsFor("conversations").find((c) => c[0] === "update");
    expect(first?.[1]).toMatchObject({ status: "closed" });
    expect(first?.[1]).not.toHaveProperty("snoozed_until");

    mockSupabase.reset();
    await updateConversationsStatus(["c1"], "snoozed", "t-1", "2030-01-01T00:00:00Z");
    const second = mockSupabase.callsFor("conversations").find((c) => c[0] === "update");
    expect(second?.[1]).toMatchObject({ status: "snoozed", snoozed_until: "2030-01-01T00:00:00Z" });
    expect(mockSupabase.callsFor("conversations")).toContainEqual(["in", "id", ["c1"]]);
    expect(mockSupabase.callsFor("conversations")).toContainEqual(["eq", "client_id", "t-1"]);
    mockSupabase.reset();
    await updateConversationsStatus(["c1"], "open", "t-1", undefined, true);
    expect(mockSupabase.callsFor("conversations").some((c) => c[0] === "eq")).toBe(false);
  });

  it("updateConversationsStatus propaga erro", async () => {
    mockSupabase.respond("conversations", { error: new Error("fail") });
    await expect(updateConversationsStatus(["c1"], "open", "t-1")).rejects.toThrow("fail");
  });

  it("updateConversationMetadata so atualiza updated_at com touch", async () => {
    await updateConversationMetadata("c1", { a: 1 });
    let patch = mockSupabase.callsFor("conversations").find((c) => c[0] === "update")?.[1];
    expect(patch).toEqual({ metadata: { a: 1 } });
    mockSupabase.reset();
    await updateConversationMetadata("c1", { a: 1 }, true);
    patch = mockSupabase.callsFor("conversations").find((c) => c[0] === "update")?.[1];
    expect(patch).toHaveProperty("updated_at");
  });

  it("markConversationsRead / Unread zeram ou setam unread_count em lote", async () => {
    await markConversationsRead(["c1"], "t-1");
    expect(mockSupabase.callsFor("conversations")).toContainEqual(["update", { unread_count: 0 }]);
    expect(mockSupabase.callsFor("conversations")).toContainEqual(["eq", "client_id", "t-1"]);
    mockSupabase.reset();
    await markConversationsUnread(["c1"], "t-1");
    expect(mockSupabase.callsFor("conversations")).toContainEqual(["update", { unread_count: 1 }]);
    expect(mockSupabase.callsFor("conversations")).toContainEqual(["eq", "client_id", "t-1"]);
    mockSupabase.reset();
    await markConversationsUnread(["c1"], "t-1", true);
    expect(mockSupabase.callsFor("conversations").some((c) => c[0] === "eq")).toBe(false);
    mockSupabase.respond("conversations", { error: new Error("e") });
    await expect(markConversationsRead(["c1"], "t-1")).rejects.toThrow("e");
  });
});

describe("services/inbox - mensagens", () => {
  it("listMessagesByConversationIds inverte para ordem cronologica e limita a pagina", async () => {
    mockSupabase.respond("messages", { data: [{ id: "m3" }, { id: "m2" }, { id: "m1" }] });
    const rows = await listMessagesByConversationIds(["c1"]);
    expect(rows.map((r) => r.id)).toEqual(["m1", "m2", "m3"]);
    const calls = mockSupabase.callsFor("messages");
    expect(calls).toContainEqual(["in", "conversation_id", ["c1"]]);
    expect(calls).toContainEqual(["limit", MESSAGE_PAGE_SIZE]);
    expect(calls.some((c) => c[0] === "lt")).toBe(false);
  });

  it("listMessagesByConversationIds usa cursor 'before' com lt(created_at)", async () => {
    await listMessagesByConversationIds(["c1"], "2025-01-01T00:00:00Z");
    expect(mockSupabase.callsFor("messages")).toContainEqual(["lt", "created_at", "2025-01-01T00:00:00Z"]);
  });

  it("listMessagesByConversationIds propaga erro e devolve [] para data null", async () => {
    mockSupabase.respond("messages", { data: null });
    expect(await listMessagesByConversationIds(["c1"])).toEqual([]);
    mockSupabase.respond("messages", { error: new Error("m") });
    await expect(listMessagesByConversationIds(["c1"])).rejects.toThrow("m");
  });

  it("insertMessage insere a linha e propaga erro", async () => {
    const row = { conversation_id: "c1", content: "oi" } as never;
    await insertMessage(row);
    expect(mockSupabase.callsFor("messages")).toContainEqual(["insert", row]);
    mockSupabase.respond("messages", { error: new Error("no") });
    await expect(insertMessage(row)).rejects.toThrow("no");
  });
});

describe("services/inbox - templates, macros e contadores", () => {
  it("listInboxTemplates filtra por client_id", async () => {
    mockSupabase.respond("inbox_templates", { data: [{ id: "t1" }] });
    expect(await listInboxTemplates("t-1")).toEqual([{ id: "t1" }]);
    expect(mockSupabase.callsFor("inbox_templates")).toContainEqual(["eq", "client_id", "t-1"]);
  });

  it("createInboxTemplate devolve a linha criada e propaga erro", async () => {
    mockSupabase.respond("inbox_templates", { data: { id: "n1" } });
    const row = { client_id: "t-1", name: "x", content: "y" } as never;
    expect(await createInboxTemplate(row)).toEqual({ id: "n1" });
    expect(mockSupabase.callsFor("inbox_templates")).toContainEqual(["insert", row]);
    mockSupabase.respond("inbox_templates", { error: new Error("bad") });
    await expect(createInboxTemplate(row)).rejects.toThrow("bad");
  });

  it("listMacros filtra por client_id e ordena por nome", async () => {
    mockSupabase.respond("macros", { data: [{ id: "m1" }] });
    expect(await listMacros("t-1")).toEqual([{ id: "m1" }]);
    const calls = mockSupabase.callsFor("macros");
    expect(calls).toContainEqual(["eq", "client_id", "t-1"]);
    expect(calls).toContainEqual(["order", "name", { ascending: true }]);
  });

  it("listPendingCsatConversations filtra tenant e devolve [] em erro", async () => {
    mockSupabase.respond("conversations", { data: [{ id: "c1" }] });
    expect(await listPendingCsatConversations("t-1", "2025-01-01")).toEqual([{ id: "c1" }]);
    const calls = mockSupabase.callsFor("conversations");
    expect(calls).toContainEqual(["eq", "client_id", "t-1"]);
    expect(calls).toContainEqual(["lte", "csat_requested_at", "2025-01-01"]);
    expect(calls).toContainEqual(["is", "csat_sent_at", null]);

    mockSupabase.respond("conversations", { error: new Error("x") });
    expect(await listPendingCsatConversations("t-1", "2025-01-01")).toEqual([]);
  });

  it("markCsatSent nao lanca em erro, apenas loga", async () => {
    mockSupabase.respond("conversations", { error: new Error("x") });
    await expect(markCsatSent("c1", "2025-01-01")).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
    expect(mockSupabase.callsFor("conversations")).toContainEqual(["update", { csat_sent_at: "2025-01-01" }]);
  });

  it("countOpenUnreadConversations filtra tenant/status e cai para 0", async () => {
    mockSupabase.respond("conversations", { count: 7 }, { count: null });
    expect(await countOpenUnreadConversations("t-1")).toBe(7);
    expect(await countOpenUnreadConversations("t-1")).toBe(0);
    const calls = mockSupabase.callsFor("conversations");
    expect(calls).toContainEqual(["eq", "client_id", "t-1"]);
    expect(calls).toContainEqual(["eq", "status", "open"]);
    expect(calls).toContainEqual(["gt", "unread_count", 0]);
  });

  it("countOpenUnreadConversations propaga erro", async () => {
    mockSupabase.respond("conversations", { error: new Error("c") });
    await expect(countOpenUnreadConversations("t-1")).rejects.toThrow("c");
  });

  it("countPendingTasks filtra por client_id e exclui status finais", async () => {
    mockSupabase.respond("tasks", { count: 3 });
    expect(await countPendingTasks("t-1")).toBe(3);
    const calls = mockSupabase.callsFor("tasks");
    expect(calls).toContainEqual(["eq", "client_id", "t-1"]);
    expect(calls).toContainEqual(["not", "status", "in", "(completed,done,cancelled)"]);
  });
});

describe("services/inbox - reassignConversationsToLead", () => {
  it("filtra por client_id e pula o filtro em master view", async () => {
    await reassignConversationsToLead("a", "b", "t-1");
    expect(mockSupabase.callsFor("conversations")).toContainEqual(["eq", "client_id", "t-1"]);
    expect(mockSupabase.callsFor("conversations")).toContainEqual(["eq", "lead_id", "a"]);
    mockSupabase.reset();
    await reassignConversationsToLead("a", "b", "t-1", true);
    expect(mockSupabase.callsFor("conversations")).not.toContainEqual(["eq", "client_id", "t-1"]);
  });
});
