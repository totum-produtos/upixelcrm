import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockSupabase } from "../helpers/supabaseMock";

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase.client }));
vi.mock("@/lib/supabase-untyped", () => ({
  untypedFrom: (t: string) => mockSupabase.client.from(t),
  untypedRpc: (fn: string, a?: Record<string, unknown>) => mockSupabase.client.rpc(fn, a),
}));

import {
  getGoals,
  createGoal,
  updateGoal,
  toggleGoalActive,
  deleteGoal,
  getGoalsProgress,
  listMetricTimestamps,
} from "@/services/goals";

const TENANT = "11111111-1111-4111-8111-111111111111";
const START = new Date("2026-01-01T00:00:00.000Z");
const END = new Date("2026-02-01T00:00:00.000Z");

beforeEach(() => mockSupabase.reset());

describe("services/goals - getGoals", () => {
  const row = {
    id: "g1",
    client_id: "t-1",
    title: "Meta",
    metric: "leads_created",
    target_value: 10,
    period: "monthly",
    column_id: "",
    is_active: true,
    created_at: "c",
    updated_at: "u",
    goal_assignments: [
      { id: "a1", goal_id: "g1", user_id: "u1" },
      { id: "a2", goal_id: "g1", user_id: null },
    ],
  };

  it("filtra por client_id e is_active por padrao", async () => {
    mockSupabase.respond("goals", { data: [] });
    await getGoals("t-1");
    const calls = mockSupabase.callsFor("goals");
    expect(calls).toContainEqual(["eq", "client_id", "t-1"]);
    expect(calls).toContainEqual(["eq", "is_active", true]);
  });

  it("includeInactive remove o filtro is_active mas mantem client_id", async () => {
    await getGoals("t-1", true);
    const calls = mockSupabase.callsFor("goals");
    expect(calls).toContainEqual(["eq", "client_id", "t-1"]);
    expect(calls).not.toContainEqual(["eq", "is_active", true]);
  });

  it("mapeia linhas: column_id vazio vira undefined e user_id null vira undefined", async () => {
    mockSupabase.respond("goals", { data: [row] });
    const [g] = await getGoals("t-1");
    expect(g.column_id).toBeUndefined();
    expect(g.assignments).toEqual([
      { id: "a1", goal_id: "g1", user_id: "u1" },
      { id: "a2", goal_id: "g1", user_id: undefined },
    ]);
    expect(g.title).toBe("Meta");
  });

  it("goal_assignments ausente vira lista vazia e data null vira []", async () => {
    mockSupabase.respond("goals", { data: [{ ...row, goal_assignments: null }] });
    expect((await getGoals("t-1"))[0].assignments).toEqual([]);
    mockSupabase.respond("goals", { data: null });
    expect(await getGoals("t-1")).toEqual([]);
  });

  it("propaga erro", async () => {
    mockSupabase.respond("goals", { error: new Error("boom") });
    await expect(getGoals("t-1")).rejects.toThrow("boom");
  });
});

describe("services/goals - createGoal", () => {
  const base = {
    clientId: "t-1",
    tenantId: TENANT,
    title: "T",
    metric: "leads_created" as const,
    target_value: 5,
    period: "monthly" as const,
    userIds: ["u1", "u2"],
  };

  it("insere meta com client_id e tenant_id validos e sincroniza assignments com tenant", async () => {
    mockSupabase.respond("goals", { data: { id: "g1", client_id: "t-1", title: "T" } });
    const goal = await createGoal(base);
    const ins = mockSupabase.callsFor("goals").find((c) => c[0] === "insert");
    expect(ins?.[1]).toMatchObject({ client_id: "t-1", tenant_id: TENANT, column_id: null });

    const aIns = mockSupabase.callsFor("goal_assignments").find((c) => c[0] === "insert");
    expect(aIns?.[1]).toEqual([
      { goal_id: "g1", user_id: "u1", client_id: "t-1", tenant_id: TENANT },
      { goal_id: "g1", user_id: "u2", client_id: "t-1", tenant_id: TENANT },
    ]);
    expect(mockSupabase.callsFor("goal_assignments")).toContainEqual(["eq", "goal_id", "g1"]);
    expect(goal.assignments?.map((a) => a.user_id)).toEqual(["u1", "u2"]);
  });

  it("tenantId invalido (ex: master) nao envia tenant_id", async () => {
    mockSupabase.respond("goals", { data: { id: "g1" } });
    await createGoal({ ...base, tenantId: "master" });
    const ins = mockSupabase.callsFor("goals").find((c) => c[0] === "insert");
    expect(ins?.[1]).not.toHaveProperty("tenant_id");
    const aIns = mockSupabase.callsFor("goal_assignments").find((c) => c[0] === "insert");
    expect((aIns?.[1] as Record<string, unknown>[])[0]).not.toHaveProperty("tenant_id");
  });

  it("userIds vazio cria um unico assignment da equipe toda (user_id null)", async () => {
    mockSupabase.respond("goals", { data: { id: "g1" } });
    const goal = await createGoal({ ...base, userIds: [] });
    const aIns = mockSupabase.callsFor("goal_assignments").find((c) => c[0] === "insert");
    expect(aIns?.[1]).toEqual([{ goal_id: "g1", user_id: null, client_id: "t-1", tenant_id: TENANT }]);
    expect(goal.assignments).toHaveLength(1);
    expect(goal.assignments?.[0].user_id).toBeUndefined();
  });

  it("column_id informado e preservado", async () => {
    mockSupabase.respond("goals", { data: { id: "g1" } });
    await createGoal({ ...base, column_id: "col-1" });
    const ins = mockSupabase.callsFor("goals").find((c) => c[0] === "insert");
    expect(ins?.[1]).toMatchObject({ column_id: "col-1" });
  });

  it("erro no insert da meta propaga e nao toca em goal_assignments", async () => {
    mockSupabase.respond("goals", { error: new Error("ins") });
    await expect(createGoal(base)).rejects.toThrow("ins");
    expect(mockSupabase.callsFor("goal_assignments")).toEqual([]);
  });

  it("erro ao apagar assignments antigos propaga antes de inserir", async () => {
    mockSupabase.respond("goals", { data: { id: "g1" } });
    mockSupabase.respond("goal_assignments", { error: new Error("del") });
    await expect(createGoal(base)).rejects.toThrow("del");
    expect(mockSupabase.callsFor("goal_assignments").some((c) => c[0] === "insert")).toBe(false);
  });
});

describe("services/goals - update / toggle / delete", () => {
  it("updateGoal sem assignments so atualiza a meta por id", async () => {
    await updateGoal("g1", { title: "Novo" });
    expect(mockSupabase.callsFor("goals")).toContainEqual(["update", { title: "Novo" }]);
    expect(mockSupabase.callsFor("goals")).toContainEqual(["eq", "id", "g1"]);
    expect(mockSupabase.callsFor("goal_assignments")).toEqual([]);
  });

  it("updateGoal com assignments ressincroniza com client_id e tenant_id", async () => {
    await updateGoal("g1", { target_value: 3 }, { clientId: "t-1", tenantId: TENANT, userIds: ["u1"] });
    const aIns = mockSupabase.callsFor("goal_assignments").find((c) => c[0] === "insert");
    expect(aIns?.[1]).toEqual([{ goal_id: "g1", user_id: "u1", client_id: "t-1", tenant_id: TENANT }]);
  });

  it("updateGoal propaga erro e nao sincroniza assignments", async () => {
    mockSupabase.respond("goals", { error: new Error("upd") });
    await expect(
      updateGoal("g1", { title: "x" }, { clientId: "t-1", userIds: [] })
    ).rejects.toThrow("upd");
    expect(mockSupabase.callsFor("goal_assignments")).toEqual([]);
  });

  it("toggleGoalActive atualiza is_active", async () => {
    await toggleGoalActive("g1", false);
    expect(mockSupabase.callsFor("goals")).toContainEqual(["update", { is_active: false }]);
    expect(mockSupabase.callsFor("goals")).toContainEqual(["eq", "id", "g1"]);
  });

  it("deleteGoal e soft delete (is_active=false), nunca delete", async () => {
    await deleteGoal("g1");
    const calls = mockSupabase.callsFor("goals");
    expect(calls).toContainEqual(["update", { is_active: false }]);
    expect(calls.some((c) => c[0] === "delete")).toBe(false);
  });

  it("toggleGoalActive e deleteGoal propagam erro", async () => {
    mockSupabase.respond("goals", { error: new Error("e") });
    await expect(toggleGoalActive("g1", true)).rejects.toThrow("e");
    await expect(deleteGoal("g1")).rejects.toThrow("e");
  });
});

describe("services/goals - getGoalsProgress", () => {
  it("chama rpc goals_progress com datas ISO e devolve linhas", async () => {
    mockSupabase.respondRpc("goals_progress", { data: [{ goal_id: "g1", user_id: null, current_value: 3 }] });
    const rows = await getGoalsProgress(START, END);
    expect(rows).toEqual([{ goal_id: "g1", user_id: null, current_value: 3 }]);
    expect(mockSupabase.rpcCalls()).toEqual([
      { fn: "goals_progress", args: { p_start: START.toISOString(), p_end: END.toISOString() } },
    ]);
  });

  it("data null vira [] e erro propaga", async () => {
    expect(await getGoalsProgress(START, END)).toEqual([]);
    mockSupabase.respondRpc("goals_progress", { error: new Error("rpc") });
    await expect(getGoalsProgress(START, END)).rejects.toThrow("rpc");
  });
});

describe("services/goals - listMetricTimestamps", () => {
  it("leads_created le created_at no range e filtra por responsavel", async () => {
    mockSupabase.respond("leads", { data: [{ created_at: "a" }, { created_at: "b" }] });
    const r = await listMetricTimestamps("leads_created", START, END, { userId: "u1" });
    expect(r).toEqual(["a", "b"]);
    const calls = mockSupabase.callsFor("leads");
    expect(calls).toContainEqual(["gte", "created_at", START.toISOString()]);
    expect(calls).toContainEqual(["lt", "created_at", END.toISOString()]);
    expect(calls).toContainEqual(["eq", "responsible_id", "u1"]);
  });

  it("sem userId nao aplica filtro de responsavel", async () => {
    await listMetricTimestamps("leads_created", START, END);
    expect(mockSupabase.callsFor("leads").some((c) => c[0] === "eq")).toBe(false);
  });

  it("tasks_completed filtra status completed, descarta completed_at nulo", async () => {
    mockSupabase.respond("tasks", { data: [{ completed_at: "x" }, { completed_at: null }] });
    const r = await listMetricTimestamps("tasks_completed", START, END, { userId: "u1" });
    expect(r).toEqual(["x"]);
    const calls = mockSupabase.callsFor("tasks");
    expect(calls).toContainEqual(["eq", "status", "completed"]);
    expect(calls).toContainEqual(["eq", "assigned_to_id", "u1"]);
  });

  it("leads_closed sem columnId devolve [] sem consultar o banco", async () => {
    expect(await listMetricTimestamps("leads_closed", START, END)).toEqual([]);
    expect(mockSupabase.client.from).not.toHaveBeenCalled();
  });

  it("leads_closed filtra por coluna e usa updated_at", async () => {
    mockSupabase.respond("leads", { data: [{ updated_at: "u" }] });
    const r = await listMetricTimestamps("leads_closed", START, END, { columnId: "c1", userId: "u1" });
    expect(r).toEqual(["u"]);
    const calls = mockSupabase.callsFor("leads");
    expect(calls).toContainEqual(["eq", "column_id", "c1"]);
    expect(calls).toContainEqual(["eq", "responsible_id", "u1"]);
  });

  it.each([
    ["contacts_made", "note"],
    ["calls_made", "call"],
    ["call_attempts", "call_attempt"],
    ["meetings_done", "meeting"],
  ] as const)("%s le timeline_events do tipo %s", async (metric, type) => {
    mockSupabase.respond("timeline_events", { data: [{ created_at: "t" }] });
    const r = await listMetricTimestamps(metric, START, END, { userId: "u1" });
    expect(r).toEqual(["t"]);
    const calls = mockSupabase.callsFor("timeline_events");
    expect(calls).toContainEqual(["eq", "type", type]);
    expect(calls).toContainEqual(["eq", "user_id", "u1"]);
  });

  it("metrica desconhecida devolve [] sem consultar o banco", async () => {
    expect(await listMetricTimestamps("nao_existe" as never, START, END)).toEqual([]);
    expect(mockSupabase.client.from).not.toHaveBeenCalled();
  });

  it("propaga erro em cada ramo", async () => {
    for (const [metric, table] of [
      ["leads_created", "leads"],
      ["tasks_completed", "tasks"],
      ["calls_made", "timeline_events"],
    ] as const) {
      mockSupabase.respond(table, { error: new Error(table) });
      await expect(listMetricTimestamps(metric, START, END)).rejects.toThrow(table);
    }
  });
});
