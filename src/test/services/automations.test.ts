import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockSupabase } from "../helpers/supabaseMock";

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase.client }));
vi.mock("@/lib/supabase-untyped", () => ({
  untypedFrom: (t: string) => mockSupabase.client.from(t),
  untypedRpc: (fn: string, a?: Record<string, unknown>) => mockSupabase.client.rpc(fn, a),
}));

import {
  listSequences,
  listSequenceSteps,
  createSequence,
  updateSequence,
  deleteSequence,
  listComplexAutomations,
  listAutomationRules,
  insertComplexAutomation,
  listAutomationRuns,
  pauseAutomationRun,
  listAutomationStats,
  triggerAutomationEngine,
  triggerAutomationWorker,
  listBots,
  createBot,
  getBotFull,
  saveBotDraft,
  publishBot,
  listInstagramAutoReplies,
  insertInstagramAutoReply,
  deleteInstagramAutoReply,
} from "@/services/automations";

beforeEach(() => mockSupabase.reset());

describe("services/automations - leituras com tenant", () => {
  it("listSequences filtra por client_id e devolve [] quando data é null", async () => {
    expect(await listSequences("t-1")).toEqual([]);
    expect(mockSupabase.callsFor("message_sequences")).toContainEqual(["eq", "client_id", "t-1"]);
  });

  it("listSequences propaga erro", async () => {
    mockSupabase.respond("message_sequences", { error: new Error("boom") });
    await expect(listSequences("t-1")).rejects.toThrow("boom");
  });

  it("listAutomationStats filtra por client_id", async () => {
    mockSupabase.respond("automation_runs_summary", { data: [{ automation_id: "a" }] });
    expect(await listAutomationStats("t-1")).toEqual([{ automation_id: "a" }]);
    expect(mockSupabase.callsFor("automation_runs_summary")).toContainEqual(["eq", "client_id", "t-1"]);
  });

  it("listBots filtra por client_id e propaga erro", async () => {
    mockSupabase.respond("bots", { data: [{ id: "b1" }] });
    expect(await listBots("t-1")).toEqual([{ id: "b1" }]);
    expect(mockSupabase.callsFor("bots")).toContainEqual(["eq", "client_id", "t-1"]);
    mockSupabase.respond("bots", { error: new Error("x") });
    await expect(listBots("t-1")).rejects.toThrow("x");
  });

  it("listInstagramAutoReplies filtra por client_id via untypedFrom", async () => {
    mockSupabase.respond("instagram_auto_replies", { data: [{ id: "i1" }] });
    expect(await listInstagramAutoReplies("t-1")).toEqual([{ id: "i1" }]);
    expect(mockSupabase.callsFor("instagram_auto_replies")).toContainEqual(["eq", "client_id", "t-1"]);
  });

  it("listInstagramAutoReplies propaga erro", async () => {
    mockSupabase.respond("instagram_auto_replies", { error: new Error("ig") });
    await expect(listInstagramAutoReplies("t-1")).rejects.toThrow("ig");
  });
});

describe("services/automations - masterView", () => {
  it("listComplexAutomations filtra por client_id por padrão", async () => {
    await listComplexAutomations("t-1");
    expect(mockSupabase.callsFor("automations")).toContainEqual(["eq", "client_id", "t-1"]);
  });

  it("listComplexAutomations em masterView NAO filtra por client_id", async () => {
    await listComplexAutomations("t-1", true);
    expect(mockSupabase.callsFor("automations").some((c) => c[0] === "eq")).toBe(false);
  });

  it("listAutomationRules respeita o filtro de tenant e masterView", async () => {
    await listAutomationRules("t-1");
    expect(mockSupabase.callsFor("automation_rules")).toContainEqual(["eq", "client_id", "t-1"]);
    mockSupabase.reset();
    await listAutomationRules("t-1", true);
    expect(mockSupabase.callsFor("automation_rules").some((c) => c[0] === "eq")).toBe(false);
  });

  it("listAutomationRules propaga erro", async () => {
    mockSupabase.respond("automation_rules", { error: new Error("rules") });
    await expect(listAutomationRules("t-1")).rejects.toThrow("rules");
  });
});

describe("services/automations - sequences e steps", () => {
  it("listSequenceSteps com lista vazia nao consulta o banco", async () => {
    expect(await listSequenceSteps([])).toEqual([]);
    expect(mockSupabase.client.from).not.toHaveBeenCalled();
  });

  it("listSequenceSteps usa in(sequence_id) e ordena por step_order", async () => {
    mockSupabase.respond("message_sequence_steps", { data: [{ id: "s1" }] });
    expect(await listSequenceSteps(["a", "b"])).toEqual([{ id: "s1" }]);
    const calls = mockSupabase.callsFor("message_sequence_steps");
    expect(calls).toContainEqual(["in", "sequence_id", ["a", "b"]]);
    expect(calls).toContainEqual(["order", "step_order", { ascending: true }]);
  });

  it("createSequence insere a linha e devolve o registro criado", async () => {
    mockSupabase.respond("message_sequences", { data: { id: "s1", client_id: "t-1" } });
    const row = { client_id: "t-1", name: "Seq" } as never;
    expect(await createSequence(row)).toEqual({ id: "s1", client_id: "t-1" });
    expect(mockSupabase.callsFor("message_sequences")).toContainEqual(["insert", row]);
  });

  it("createSequence propaga erro", async () => {
    mockSupabase.respond("message_sequences", { error: new Error("dup") });
    await expect(createSequence({} as never)).rejects.toThrow("dup");
  });

  it("updateSequence e deleteSequence filtram por id e propagam erro", async () => {
    await updateSequence("s1", { name: "N" });
    expect(mockSupabase.callsFor("message_sequences")).toContainEqual(["update", { name: "N" }]);
    expect(mockSupabase.callsFor("message_sequences")).toContainEqual(["eq", "id", "s1"]);
    mockSupabase.respond("message_sequences", { error: new Error("del") });
    await expect(deleteSequence("s1")).rejects.toThrow("del");
  });
});

describe("services/automations - automations e runs", () => {
  it("insertComplexAutomation devolve null quando nao ha data", async () => {
    expect(await insertComplexAutomation({} as never)).toBeNull();
  });

  it("listAutomationRuns filtra por automation_id, ordena e aplica limit padrao 200", async () => {
    mockSupabase.respond("automation_runs", { data: [{ id: "r1" }] });
    expect(await listAutomationRuns("a-1")).toEqual([{ id: "r1" }]);
    const calls = mockSupabase.callsFor("automation_runs");
    expect(calls).toContainEqual(["eq", "automation_id", "a-1"]);
    expect(calls).toContainEqual(["limit", 200]);
    expect(calls).toContainEqual(["order", "started_at", { ascending: false }]);
  });

  it("listAutomationRuns respeita limit customizado e propaga erro", async () => {
    await listAutomationRuns("a-1", 5);
    expect(mockSupabase.callsFor("automation_runs")).toContainEqual(["limit", 5]);
    mockSupabase.respond("automation_runs", { error: new Error("runs") });
    await expect(listAutomationRuns("a-1")).rejects.toThrow("runs");
  });

  it("pauseAutomationRun marca status paused com finished_at e filtra por id", async () => {
    await pauseAutomationRun("run-1");
    const calls = mockSupabase.callsFor("automation_runs");
    const upd = calls.find((c) => c[0] === "update");
    expect(upd?.[1]).toMatchObject({ status: "paused" });
    expect(typeof (upd?.[1] as { finished_at: string }).finished_at).toBe("string");
    expect(calls).toContainEqual(["eq", "id", "run-1"]);
  });
});

describe("services/automations - edge functions", () => {
  it("triggerAutomationEngine invoca automation-engine com o body", async () => {
    const body = { automation_id: "a", lead_id: "l", node_id: "n", context: { x: 1 } };
    await triggerAutomationEngine(body);
    expect(mockSupabase.invokeCalls()).toEqual([{ fn: "automation-engine", options: { body } }]);
  });

  it("triggerAutomationWorker invoca automation-worker com body vazio", async () => {
    await triggerAutomationWorker();
    expect(mockSupabase.invokeCalls()).toEqual([{ fn: "automation-worker", options: { body: {} } }]);
  });
});

describe("services/automations - bots", () => {
  it("createBot devolve o id criado", async () => {
    mockSupabase.respond("bots", { data: { id: "b9" } });
    expect(await createBot({ name: "x" } as never)).toEqual({ id: "b9" });
  });

  it("getBotFull propaga erro", async () => {
    mockSupabase.respond("bots", { error: new Error("nf") });
    await expect(getBotFull("b1")).rejects.toThrow("nf");
  });

  it("saveBotDraft grava somente draft_* e nao toca em nodes/status", async () => {
    await saveBotDraft("b1", [1], [2]);
    const upd = mockSupabase.callsFor("bots").find((c) => c[0] === "update");
    expect(upd?.[1]).toEqual({ draft_nodes: [1], draft_edges: [2] });
    expect(mockSupabase.callsFor("bots")).toContainEqual(["eq", "id", "b1"]);
  });

  it("publishBot promove rascunho: limpa draft, status published e published_at", async () => {
    await publishBot("b1", [1], [2]);
    const upd = mockSupabase.callsFor("bots").find((c) => c[0] === "update");
    expect(upd?.[1]).toMatchObject({
      nodes: [1],
      edges: [2],
      draft_nodes: null,
      draft_edges: null,
      status: "published",
    });
    expect(typeof (upd?.[1] as { published_at: string }).published_at).toBe("string");
  });

  it("publishBot propaga erro", async () => {
    mockSupabase.respond("bots", { error: new Error("pub") });
    await expect(publishBot("b1", [], [])).rejects.toThrow("pub");
  });
});

describe("services/automations - instagram_auto_replies", () => {
  it("insertInstagramAutoReply envia o payload e propaga erro", async () => {
    const payload = { client_id: "t-1", keyword: "oi" };
    await insertInstagramAutoReply(payload);
    expect(mockSupabase.callsFor("instagram_auto_replies")).toContainEqual(["insert", payload]);
    mockSupabase.respond("instagram_auto_replies", { error: new Error("ins") });
    await expect(insertInstagramAutoReply(payload)).rejects.toThrow("ins");
  });

  it("deleteInstagramAutoReply filtra por id", async () => {
    await deleteInstagramAutoReply("i1");
    expect(mockSupabase.callsFor("instagram_auto_replies")).toContainEqual(["eq", "id", "i1"]);
  });
});
