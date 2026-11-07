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
  listTags,
  createTag,
  listCustomFieldDefinitions,
  updateCustomFieldDefinition,
  listLeadPhonesPage,
  insertLeadsChunk,
  listAttributedLeads,
  listAllLeads,
  bulkMoveLeads,
  bulkDeleteLeads,
  bulkAddTag,
  bulkUpdateLeadCustomField,
  reassignAndMergePrimary,
  bulkDeleteLeadsLogOnly,
  listDismissedDuplicateGroupKeys,
  insertDuplicateException,
  findLeadIdsByPhoneSuffix,
  findLeadIdsByEmail,
  getFirstPipelineColumnId,
  listPipelines,
  listPipelineColumns,
  listTasks,
  listTimelineEvents,
  listLeadTimelineEventsPage,
  countLeads,
  listLeadColumnIdsPage,
  listLeadsPage,
  completeTaskRpc,
  reopenTaskRpc,
  updateTaskResultRpc,
  insertLead,
  updateLead,
} from "@/services/leads";

beforeEach(() => mockSupabase.reset());

const ids = (n: number) => Array.from({ length: n }, (_, i) => `id-${i}`);

describe("services/leads - tags", () => {
  it("listTags filtra por tenant_id (não client_id) e ordena por name", async () => {
    mockSupabase.respond("tags", { data: [{ id: "1", name: "a" }] });
    expect(await listTags("t-1")).toEqual([{ id: "1", name: "a" }]);
    const calls = mockSupabase.callsFor("tags");
    expect(calls).toContainEqual(["eq", "tenant_id", "t-1"]);
    expect(calls.some((c) => c[0] === "eq" && c[1] === "client_id")).toBe(false);
    expect(calls).toContainEqual(["order", "name", { ascending: true }]);
  });

  it("listTags propaga erro e devolve [] quando data é null", async () => {
    mockSupabase.respond("tags", { error: new Error("boom") });
    await expect(listTags("t-1")).rejects.toThrow("boom");
    mockSupabase.respond("tags", { data: null });
    expect(await listTags("t-1")).toEqual([]);
  });

  it("createTag grava tenant_id com defaults de cor e categoria", async () => {
    mockSupabase.respond("tags", { data: { id: "9" } });
    await createTag("t-1", { name: "vip" });
    const insert = mockSupabase.callsFor("tags").find((c) => c[0] === "insert");
    expect(insert?.[1]).toEqual({
      tenant_id: "t-1",
      name: "vip",
      color: "#6366f1",
      category: "general",
    });
  });

  it("createTag respeita cor/categoria informadas e propaga erro", async () => {
    mockSupabase.respond("tags", { data: { id: "9" } });
    await createTag("t-1", { name: "x", color: "#fff", category: "src" });
    const insert = mockSupabase.callsFor("tags").find((c) => c[0] === "insert");
    expect(insert?.[1]).toMatchObject({ color: "#fff", category: "src" });

    mockSupabase.respond("tags", { error: new Error("dup") });
    await expect(createTag("t-1", { name: "x" })).rejects.toThrow("dup");
  });
});

describe("services/leads - custom_field_definitions", () => {
  it("listCustomFieldDefinitions filtra por client_id e ordena", async () => {
    mockSupabase.respond("custom_field_definitions", { data: [{ id: "f" }] });
    expect(await listCustomFieldDefinitions("c-1")).toEqual([{ id: "f" }]);
    const calls = mockSupabase.callsFor("custom_field_definitions");
    expect(calls).toContainEqual(["eq", "client_id", "c-1"]);
    expect(calls).toContainEqual(["order", "display_order", { ascending: true }]);
  });

  it("listCustomFieldDefinitions lança em erro", async () => {
    mockSupabase.respond("custom_field_definitions", { error: new Error("x") });
    await expect(listCustomFieldDefinitions("c-1")).rejects.toThrow("x");
  });

  it("updateCustomFieldDefinition adiciona updated_at e filtra por id", async () => {
    await updateCustomFieldDefinition("f-1", { name: "Novo" });
    const calls = mockSupabase.callsFor("custom_field_definitions");
    const upd = calls.find((c) => c[0] === "update");
    expect(upd?.[1]).toMatchObject({ name: "Novo" });
    expect(typeof (upd?.[1] as { updated_at: string }).updated_at).toBe("string");
    expect(calls).toContainEqual(["eq", "id", "f-1"]);
  });
});

describe("services/leads - importação e consultas por tenant", () => {
  it("listLeadPhonesPage filtra por client_id, ignora phone nulo e pagina", async () => {
    mockSupabase.respond("leads", { data: [{ phone: "1" }] });
    expect(await listLeadPhonesPage("c-1", 0, 999)).toEqual([{ phone: "1" }]);
    const calls = mockSupabase.callsFor("leads");
    expect(calls).toContainEqual(["eq", "client_id", "c-1"]);
    expect(calls).toContainEqual(["not", "phone", "is", null]);
    expect(calls).toContainEqual(["range", 0, 999]);
  });

  it("listLeadPhonesPage devolve null em erro e [] sem dados", async () => {
    mockSupabase.respond("leads", { error: new Error("x") }, { data: null });
    expect(await listLeadPhonesPage("c-1", 0, 9)).toBeNull();
    expect(await listLeadPhonesPage("c-1", 0, 9)).toEqual([]);
  });

  it("insertLeadsChunk devolve ids inseridos sem lançar", async () => {
    mockSupabase.respond("leads", { data: [{ id: "a" }, { id: "b" }] });
    const r = await insertLeadsChunk([{ name: "x" }, { name: "y" }]);
    expect(r).toEqual({ error: null, ids: ["a", "b"] });
    expect(mockSupabase.callsFor("leads")).toContainEqual(["insert", [{ name: "x" }, { name: "y" }]]);
  });

  it("insertLeadsChunk retorna erro (com code) e ids vazio, sem lançar", async () => {
    const err = { code: "23505", message: "dup" };
    mockSupabase.respond("leads", { error: err });
    expect(await insertLeadsChunk([{ name: "x" }])).toEqual({ error: err, ids: [] });
  });

  it("listAttributedLeads filtra por client_id, ordena e aplica limite padrão 200", async () => {
    mockSupabase.respond("leads", { data: [{ id: "1" }] }, { data: null });
    expect(await listAttributedLeads("c-1")).toEqual([{ id: "1" }]);
    const calls = mockSupabase.callsFor("leads");
    expect(calls).toContainEqual(["eq", "client_id", "c-1"]);
    expect(calls).toContainEqual(["limit", 200]);
    expect(calls).toContainEqual(["order", "created_at", { ascending: false }]);
    expect(await listAttributedLeads("c-1", 10)).toEqual([]);
  });

  it("listAllLeads filtra por client_id, limite padrão 5000 e lança em erro", async () => {
    mockSupabase.respond("leads", { data: [{ id: "1" }] });
    expect(await listAllLeads("c-1")).toEqual([{ id: "1" }]);
    expect(mockSupabase.callsFor("leads")).toContainEqual(["eq", "client_id", "c-1"]);
    expect(mockSupabase.callsFor("leads")).toContainEqual(["limit", 5000]);
    mockSupabase.respond("leads", { error: new Error("nope") });
    await expect(listAllLeads("c-1")).rejects.toThrow("nope");
  });

  it("findLeadIdsByPhoneSuffix filtra por client_id e usa ilike %sufixo%", async () => {
    mockSupabase.respond("leads", { data: [{ id: "1" }] });
    expect(await findLeadIdsByPhoneSuffix("c-1", "9999")).toEqual([{ id: "1" }]);
    const calls = mockSupabase.callsFor("leads");
    expect(calls).toContainEqual(["eq", "client_id", "c-1"]);
    expect(calls).toContainEqual(["ilike", "phone", "%9999%"]);
    expect(calls).toContainEqual(["order", "created_at", { ascending: true }]);
  });

  it("findLeadIdsByPhoneSuffix e findLeadIdsByEmail lançam em erro", async () => {
    mockSupabase.respond("leads", { error: new Error("e") });
    await expect(findLeadIdsByPhoneSuffix("c-1", "1")).rejects.toThrow("e");
    await expect(findLeadIdsByEmail("c-1", "a@b.c")).rejects.toThrow("e");
  });

  it("findLeadIdsByEmail filtra por client_id e limita a 1", async () => {
    mockSupabase.respond("leads", { data: [{ id: "1" }] });
    expect(await findLeadIdsByEmail("c-1", "a@b.c")).toEqual([{ id: "1" }]);
    const calls = mockSupabase.callsFor("leads");
    expect(calls).toContainEqual(["eq", "client_id", "c-1"]);
    expect(calls).toContainEqual(["ilike", "email", "a@b.c"]);
    expect(calls).toContainEqual(["limit", 1]);
  });

  it("getFirstPipelineColumnId filtra por client_id e devolve id ou null", async () => {
    mockSupabase.respond("pipeline_columns", { data: { id: "col-1" } }, { data: null });
    expect(await getFirstPipelineColumnId("c-1")).toBe("col-1");
    expect(await getFirstPipelineColumnId("c-1")).toBeNull();
    expect(mockSupabase.callsFor("pipeline_columns")).toContainEqual(["eq", "client_id", "c-1"]);
  });

  it("getFirstPipelineColumnId lança em erro", async () => {
    mockSupabase.respond("pipeline_columns", { error: new Error("x") });
    await expect(getFirstPipelineColumnId("c-1")).rejects.toThrow("x");
  });
});

describe("services/leads - operações em massa", () => {
  it("bulkMoveLeads divide em chunks de 500 e envia column_id", async () => {
    await bulkMoveLeads(ids(1001), "col-9");
    const queries = mockSupabase.queriesFor("leads");
    expect(queries).toHaveLength(3);
    const sizes = queries.map((q) => (q.find((c) => c[0] === "in")?.[2] as string[]).length);
    expect(sizes).toEqual([500, 500, 1]);
    for (const q of queries) expect(q).toContainEqual(["update", { column_id: "col-9" }]);
  });

  it("bulkMoveLeads não consulta nada com lista vazia e aborta no primeiro erro", async () => {
    await bulkMoveLeads([], "col-9");
    expect(mockSupabase.queriesFor("leads")).toHaveLength(0);

    mockSupabase.respond("leads", { error: new Error("fail") });
    await expect(bulkMoveLeads(ids(1200), "col-9")).rejects.toThrow("fail");
    expect(mockSupabase.queriesFor("leads")).toHaveLength(1);
  });

  it("bulkDeleteLeads apaga em chunks e lança em erro", async () => {
    await bulkDeleteLeads(ids(501));
    expect(mockSupabase.queriesFor("leads")).toHaveLength(2);
    expect(mockSupabase.callsFor("leads").filter((c) => c[0] === "delete")).toHaveLength(2);

    mockSupabase.reset();
    mockSupabase.respond("leads", { error: new Error("rls") });
    await expect(bulkDeleteLeads(ids(3))).rejects.toThrow("rls");
  });

  it("bulkDeleteLeadsLogOnly continua nos demais chunks após erro e não lança", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSupabase.respond("leads", { error: new Error("c1") }, { error: null });
    await expect(bulkDeleteLeadsLogOnly(ids(1000))).resolves.toBeUndefined();
    expect(mockSupabase.queriesFor("leads")).toHaveLength(2);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("bulkAddTag só atualiza leads que ainda não têm a tag e retorna 0 falhas", async () => {
    mockSupabase.respond(
      "leads",
      {
        data: [
          { id: "l1", tags: ["vip"] },
          { id: "l2", tags: ["x"] },
          { id: "l3", tags: null },
        ],
      },
      { error: null }
    );
    const failures = await bulkAddTag(["l1", "l2", "l3"], "vip");
    expect(failures).toBe(0);
    const updates = mockSupabase.callsFor("leads").filter((c) => c[0] === "update");
    expect(updates).toHaveLength(2);
    expect(updates).toContainEqual(["update", { tags: ["x", "vip"] }]);
    expect(updates).toContainEqual(["update", { tags: ["vip"] }]);
  });

  it("bulkAddTag conta falhas dos updates individuais", async () => {
    mockSupabase.respond(
      "leads",
      { data: [{ id: "l1", tags: [] }, { id: "l2", tags: [] }] },
      { error: new Error("u1") },
      { error: null }
    );
    expect(await bulkAddTag(["l1", "l2"], "t")).toBe(1);
  });

  it("bulkAddTag reporta tudo como falha se o select inicial falhar e não faz updates", async () => {
    mockSupabase.respond("leads", { error: { message: "sel" } });
    expect(await bulkAddTag(["a", "b", "c"], "t")).toBe(3);
    expect(mockSupabase.callsFor("leads").some((c) => c[0] === "update")).toBe(false);
  });

  it("bulkUpdateLeadCustomField chama a RPC com os parâmetros e devolve a contagem", async () => {
    mockSupabase.respondRpc("bulk_update_lead_custom_field", { data: 7 });
    expect(await bulkUpdateLeadCustomField(["a", "b"], "cidade", "SP")).toBe(7);
    expect(mockSupabase.rpcCalls()[0]).toEqual({
      fn: "bulk_update_lead_custom_field",
      args: { p_lead_ids: ["a", "b"], p_slug: "cidade", p_value: "SP" },
    });
  });

  it("bulkUpdateLeadCustomField cai para 0 e lança em erro", async () => {
    mockSupabase.respondRpc("bulk_update_lead_custom_field", { data: null });
    expect(await bulkUpdateLeadCustomField(["a"], "s", "v")).toBe(0);
    mockSupabase.respondRpc("bulk_update_lead_custom_field", { error: new Error("rpc") });
    await expect(bulkUpdateLeadCustomField(["a"], "s", "v")).rejects.toThrow("rpc");
  });

  it("updateLead filtra por id e propaga erro", async () => {
    await updateLead("l-1", { name: "N" });
    expect(mockSupabase.callsFor("leads")).toContainEqual(["update", { name: "N" }]);
    expect(mockSupabase.callsFor("leads")).toContainEqual(["eq", "id", "l-1"]);
    mockSupabase.respond("leads", { error: new Error("x") });
    await expect(updateLead("l-1", {})).rejects.toThrow("x");
  });
});

describe("services/leads - merge de duplicatas", () => {
  it("reassignAndMergePrimary reaponta 3 tabelas e atualiza tags/notes do primário", async () => {
    const res = await reassignAndMergePrimary(["s1", "s2"], "p1", ["a", "b"], "", undefined);
    expect(res).toHaveLength(4);
    for (const t of ["conversations", "tasks", "timeline_events"]) {
      expect(mockSupabase.callsFor(t)).toContainEqual(["update", { lead_id: "p1" }]);
      expect(mockSupabase.callsFor(t)).toContainEqual(["in", "lead_id", ["s1", "s2"]]);
    }
    const leadCalls = mockSupabase.callsFor("leads");
    expect(leadCalls).toContainEqual(["update", { tags: ["a", "b"], notes: null }]);
    expect(leadCalls).toContainEqual(["eq", "id", "p1"]);
  });

  it("reassignAndMergePrimary inclui notes_local só quando informado", async () => {
    await reassignAndMergePrimary(["s1"], "p1", [], "nota", "local");
    expect(mockSupabase.callsFor("leads")).toContainEqual([
      "update",
      { tags: [], notes: "nota", notes_local: "local" },
    ]);
    mockSupabase.reset();
    await reassignAndMergePrimary(["s1"], "p1", [], "nota", null);
    expect(mockSupabase.callsFor("leads")).toContainEqual([
      "update",
      { tags: [], notes: "nota", notes_local: null },
    ]);
  });

  it("listDismissedDuplicateGroupKeys filtra por client_id e mapeia group_key", async () => {
    mockSupabase.respond("lead_duplicate_exceptions", {
      data: [{ group_key: "k1" }, { group_key: "k2" }],
    });
    expect(await listDismissedDuplicateGroupKeys("c-1")).toEqual(["k1", "k2"]);
    expect(mockSupabase.callsFor("lead_duplicate_exceptions")).toContainEqual(["eq", "client_id", "c-1"]);
  });

  it("listDismissedDuplicateGroupKeys lança em erro", async () => {
    mockSupabase.respond("lead_duplicate_exceptions", { error: new Error("x") });
    await expect(listDismissedDuplicateGroupKeys("c-1")).rejects.toThrow("x");
  });

  it("insertDuplicateException grava client_id/tenant_id e ignora 23505", async () => {
    await insertDuplicateException("c-1", "t-1", "g");
    expect(mockSupabase.callsFor("lead_duplicate_exceptions")).toContainEqual([
      "insert",
      { client_id: "c-1", tenant_id: "t-1", group_key: "g" },
    ]);
    mockSupabase.respond("lead_duplicate_exceptions", { error: { code: "23505" } });
    await expect(insertDuplicateException("c-1", null, "g")).resolves.toBeUndefined();
  });

  it("insertDuplicateException lança erros que não sejam 23505", async () => {
    mockSupabase.respond("lead_duplicate_exceptions", { error: { code: "42501", message: "rls" } });
    await expect(insertDuplicateException("c-1", "t-1", "g")).rejects.toMatchObject({ code: "42501" });
  });
});

describe("services/leads - carga do board (masterView)", () => {
  const cases: Array<[string, (c: string, m?: boolean) => Promise<unknown>]> = [
    ["pipelines", listPipelines],
    ["pipeline_columns", listPipelineColumns],
    ["tasks", listTasks],
    ["timeline_events", listTimelineEvents],
  ];

  it.each(cases)("%s filtra por client_id quando não é masterView", async (table, fn) => {
    mockSupabase.respond(table, { data: [{ id: "1" }] });
    expect(await fn("c-1")).toEqual([{ id: "1" }]);
    expect(mockSupabase.callsFor(table)).toContainEqual(["eq", "client_id", "c-1"]);
  });

  it.each(cases)("%s NÃO filtra por client_id em masterView", async (table, fn) => {
    mockSupabase.respond(table, { data: [] });
    await fn("c-1", true);
    expect(mockSupabase.callsFor(table).some((c) => c[0] === "eq")).toBe(false);
  });

  it.each(cases)("%s lança em erro e devolve [] sem dados", async (table, fn) => {
    mockSupabase.respond(table, { error: new Error("x") }, { data: null });
    await expect(fn("c-1")).rejects.toThrow("x");
    expect(await fn("c-1")).toEqual([]);
  });

  it("listTasks e listTimelineEvents aplicam limites 5000 e 100", async () => {
    await listTasks("c-1");
    await listTimelineEvents("c-1");
    expect(mockSupabase.callsFor("tasks")).toContainEqual(["limit", 5000]);
    expect(mockSupabase.callsFor("timeline_events")).toContainEqual(["limit", 100]);
  });

  it("countLeads filtra por client_id, devolve count e cai para 0", async () => {
    mockSupabase.respond("leads", { count: 12 }, { count: null });
    expect(await countLeads("c-1")).toBe(12);
    expect(await countLeads("c-1")).toBe(0);
    expect(mockSupabase.callsFor("leads")).toContainEqual(["eq", "client_id", "c-1"]);
    expect(mockSupabase.callsFor("leads")).toContainEqual(["select", "*", { count: "exact", head: true }]);
  });

  it("countLeads em masterView não filtra e lança em erro", async () => {
    mockSupabase.respond("leads", { count: 3 });
    expect(await countLeads("c-1", true)).toBe(3);
    expect(mockSupabase.callsFor("leads").some((c) => c[0] === "eq")).toBe(false);
    mockSupabase.respond("leads", { error: new Error("x") });
    await expect(countLeads("c-1")).rejects.toThrow("x");
  });

  it("listLeadColumnIdsPage respeita masterView e intervalo", async () => {
    mockSupabase.respond("leads", { data: [{ column_id: "a" }] });
    expect(await listLeadColumnIdsPage("c-1", false, 0, 999)).toEqual([{ column_id: "a" }]);
    expect(mockSupabase.callsFor("leads")).toContainEqual(["eq", "client_id", "c-1"]);
    expect(mockSupabase.callsFor("leads")).toContainEqual(["range", 0, 999]);

    mockSupabase.reset();
    await listLeadColumnIdsPage("c-1", true, 0, 9);
    expect(mockSupabase.callsFor("leads").some((c) => c[0] === "eq")).toBe(false);
  });

  it("listLeadsPage filtra por client_id, ordena desc e lança em erro", async () => {
    mockSupabase.respond("leads", { data: [{ id: "1" }] });
    expect(await listLeadsPage("c-1", false, 0, 9)).toEqual([{ id: "1" }]);
    expect(mockSupabase.callsFor("leads")).toContainEqual(["eq", "client_id", "c-1"]);
    expect(mockSupabase.callsFor("leads")).toContainEqual(["order", "created_at", { ascending: false }]);
    mockSupabase.respond("leads", { error: new Error("x") });
    await expect(listLeadsPage("c-1", false, 0, 9)).rejects.toThrow("x");
  });

  it("listLeadsPage em masterView não filtra por tenant", async () => {
    await listLeadsPage("c-1", true, 0, 9);
    expect(mockSupabase.callsFor("leads").some((c) => c[0] === "eq")).toBe(false);
  });
});

describe("services/leads - timeline do lead, tasks e inserts", () => {
  it("listLeadTimelineEventsPage escopa por lead_id e usa cursor lt quando há before", async () => {
    mockSupabase.respond("timeline_events", { data: [{ id: "e" }] });
    await listLeadTimelineEventsPage("l-1", "2025-01-01", 10);
    const calls = mockSupabase.callsFor("timeline_events");
    expect(calls).toContainEqual(["eq", "lead_id", "l-1"]);
    expect(calls).toContainEqual(["lt", "created_at", "2025-01-01"]);
    expect(calls).toContainEqual(["limit", 10]);
  });

  it("listLeadTimelineEventsPage sem before não usa cursor, limite padrão 30 e lança em erro", async () => {
    await listLeadTimelineEventsPage("l-1");
    const calls = mockSupabase.callsFor("timeline_events");
    expect(calls.some((c) => c[0] === "lt")).toBe(false);
    expect(calls).toContainEqual(["limit", 30]);
    mockSupabase.respond("timeline_events", { error: new Error("x") });
    await expect(listLeadTimelineEventsPage("l-1")).rejects.toThrow("x");
  });

  it("completeTaskRpc devolve true só quando data === true", async () => {
    mockSupabase.respondRpc("complete_task", { data: true }, { data: false }, { data: null });
    expect(await completeTaskRpc("t-1", "ok")).toBe(true);
    expect(await completeTaskRpc("t-1")).toBe(false);
    expect(await completeTaskRpc("t-1")).toBe(false);
    expect(mockSupabase.rpcCalls()[0].args).toEqual({ p_task_id: "t-1", p_result: "ok" });
    expect(mockSupabase.rpcCalls()[1].args).toEqual({ p_task_id: "t-1", p_result: undefined });
  });

  it("reopenTaskRpc e completeTaskRpc lançam em erro", async () => {
    mockSupabase.respondRpc("reopen_task", { error: new Error("r") });
    await expect(reopenTaskRpc("t-1")).rejects.toThrow("r");
    mockSupabase.respondRpc("complete_task", { error: new Error("c") });
    await expect(completeTaskRpc("t-1")).rejects.toThrow("c");
  });

  it("reopenTaskRpc devolve true quando a RPC atualiza", async () => {
    mockSupabase.respondRpc("reopen_task", { data: true });
    expect(await reopenTaskRpc("t-1")).toBe(true);
  });

  it("updateTaskResultRpc converte null/undefined em string vazia", async () => {
    mockSupabase.respondRpc("update_task_result", { data: true });
    expect(await updateTaskResultRpc("t-1", null)).toBe(true);
    await updateTaskResultRpc("t-1");
    await updateTaskResultRpc("t-1", "feito");
    const args = mockSupabase.rpcCalls().map((c) => c.args);
    expect(args).toEqual([
      { p_task_id: "t-1", p_result: "" },
      { p_task_id: "t-1", p_result: "" },
      { p_task_id: "t-1", p_result: "feito" },
    ]);
  });

  it("insertLead envia a linha (com client_id), devolve a linha criada e lança em erro", async () => {
    mockSupabase.respond("leads", { data: { id: "n" } });
    const row = { client_id: "c-1", name: "Ana" } as Parameters<typeof insertLead>[0];
    expect(await insertLead(row)).toEqual({ id: "n" });
    expect(mockSupabase.callsFor("leads")).toContainEqual(["insert", row]);
    mockSupabase.respond("leads", { error: new Error("x") });
    await expect(insertLead(row)).rejects.toThrow("x");
  });
});
