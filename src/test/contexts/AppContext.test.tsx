/**
 * Testes de caracterizacao do AppContext.
 *
 * Objetivo: travar o comportamento ATUAL de `useAppState()` (estado resultante,
 * chamadas aos services com seus argumentos, toasts e efeitos entre dominios)
 * para que refatoracoes internas do AppProvider nao mudem nada observavel.
 * Nao editar para acomodar uma refatoracao: se um teste quebrar, houve mudanca
 * de comportamento.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const mocks = vi.hoisted(() => {
  const user = { id: "user-1", client_id: "client-1", role: "admin" as string };
  return {
    leadsRepo: {
      listPipelines: vi.fn(),
      listPipelineColumns: vi.fn(),
      listTasks: vi.fn(),
      listTimelineEvents: vi.fn(),
      countLeads: vi.fn(),
      listLeadColumnIdsPage: vi.fn(),
      listLeadsPage: vi.fn(),
      insertTimelineEvent: vi.fn(),
      insertLead: vi.fn(),
      updateLead: vi.fn(),
      bulkDeleteLeads: vi.fn(),
      reassignTasksToLead: vi.fn(),
      reassignTimelineToLead: vi.fn(),
      insertTaskReturning: vi.fn(),
      updateTaskRow: vi.fn(),
      deleteTaskById: vi.fn(),
      completeTaskRpc: vi.fn(),
      reopenTaskRpc: vi.fn(),
      updateTaskResultRpc: vi.fn(),
      insertPipeline: vi.fn(),
      updatePipeline: vi.fn(),
      deletePipelineById: vi.fn(),
      deleteColumnsByPipeline: vi.fn(),
      insertPipelineColumns: vi.fn(),
      insertPipelineColumn: vi.fn(),
      updatePipelineColumn: vi.fn(),
      deletePipelineColumn: vi.fn(),
      listAllPipelineColumns: vi.fn(),
    },
    automationsRepo: {
      listComplexAutomations: vi.fn(),
      listAutomationRules: vi.fn(),
      insertComplexAutomation: vi.fn(),
      updateComplexAutomation: vi.fn(),
      deleteComplexAutomation: vi.fn(),
      insertAutomationRule: vi.fn(),
      updateAutomationRule: vi.fn(),
      deleteAutomationRule: vi.fn(),
      triggerAutomationEngine: vi.fn(),
    },
    listActiveAgents: vi.fn(),
    reassignConversationsToLead: vi.fn(),
    toast: { success: vi.fn(), error: vi.fn() },
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() },
    // Objetos estaveis entre renders (o provider le user/tenant a cada render).
    ctx: {
      user,
      tenant: null as { id: string; subdomain: string } | null,
    },
  };
});

vi.mock("@/integrations/supabase/client", async () =>
  (await import("@/test/helpers/supabaseModuleStub")).supabaseModuleMock());
vi.mock("@/services/leads", () => mocks.leadsRepo);
vi.mock("@/services/automations", () => mocks.automationsRepo);
vi.mock("@/services/users", () => ({ listActiveAgents: mocks.listActiveAgents }));
vi.mock("@/services/inbox", () => ({ reassignConversationsToLead: mocks.reassignConversationsToLead }));
vi.mock("@/lib/logger", () => ({ logger: mocks.logger }));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mocks.ctx.user }) }));
vi.mock("@/contexts/TenantContext", () => ({ useTenant: () => ({ tenant: mocks.ctx.tenant }) }));

import { AppProvider, useAppState } from "@/contexts/AppContext";

const { leadsRepo, automationsRepo, toast, ctx } = mocks;

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const TENANT = { id: TENANT_ID, subdomain: "acme" };
const NOW = "2026-01-01T00:00:00.000Z";

const PIPELINES = [
  { id: "p1", client_id: "client-1", name: "Vendas" },
  { id: "p2", client_id: "client-1", name: "Pos-venda" },
];
const COLUMNS = [
  { id: "c1", pipeline_id: "p1", name: "Novos", order: 0, color: "#3b82f6", description: null },
  { id: "c2", pipeline_id: "p1", name: "Qualificacao", order: 1, color: "#f59e0b", description: null },
  { id: "c3", pipeline_id: "p2", name: "Suporte", order: 0, color: null, description: null },
];
const leadRow = (id: string, name: string, columnId: string): Record<string, unknown> => ({
  id, client_id: "client-1", name, column_id: columnId, tags: [], phone: null, email: null,
  created_at: NOW, updated_at: NOW,
});
const LEADS = [leadRow("l1", "Ana", "c1"), leadRow("l2", "Bruno", "c2"), leadRow("l3", "Carla", "c1")];
const taskRow = (id: string, title: string, leadId: string | null, status: string): Record<string, unknown> => ({
  id, client_id: "client-1", lead_id: leadId, title, status, created_at: NOW,
});
const TASKS = [
  taskRow("t1", "Ligar", "l1", "pending"),
  taskRow("t2", "Enviar proposta", "l2", "pending"),
  taskRow("t3", "Tarefa solta", null, "completed"),
];
const TIMELINE = [
  { id: "e1", lead_id: "l1", type: "note", content: "Primeiro contato", created_at: NOW, user_name: "Maria", user_id: "user-1" },
];

function applyDefaults() {
  for (const fn of [
    ...Object.values(leadsRepo), ...Object.values(automationsRepo),
    mocks.listActiveAgents, mocks.reassignConversationsToLead,
    toast.success, toast.error, ...Object.values(mocks.logger),
  ]) fn.mockReset();

  ctx.tenant = TENANT;
  ctx.user.role = "admin";

  leadsRepo.listPipelines.mockResolvedValue(PIPELINES);
  leadsRepo.listPipelineColumns.mockResolvedValue(COLUMNS);
  leadsRepo.listTasks.mockResolvedValue(TASKS);
  leadsRepo.listTimelineEvents.mockResolvedValue(TIMELINE);
  leadsRepo.countLeads.mockResolvedValue(LEADS.length);
  leadsRepo.listLeadColumnIdsPage.mockResolvedValue(LEADS.map((l) => ({ column_id: l.column_id })));
  leadsRepo.listLeadsPage.mockResolvedValue(LEADS);
  automationsRepo.listComplexAutomations.mockResolvedValue([]);
  automationsRepo.listAutomationRules.mockResolvedValue([]);
  automationsRepo.triggerAutomationEngine.mockImplementation(() => Promise.resolve());

  let tlSeq = 0;
  leadsRepo.insertTimelineEvent.mockImplementation((row: Record<string, unknown>) =>
    Promise.resolve({ id: `tl-new-${++tlSeq}`, created_at: NOW, ...row }));
  leadsRepo.insertLead.mockImplementation((row: Record<string, unknown>) =>
    Promise.resolve({ id: "l-new", created_at: NOW, updated_at: NOW, ...row }));
  leadsRepo.insertTaskReturning.mockImplementation((row: Record<string, unknown>) =>
    Promise.resolve({ id: "t-new", status: "pending", created_at: NOW, ...row }));
  leadsRepo.insertPipeline.mockImplementation((row: Record<string, unknown>) =>
    Promise.resolve({ id: "p-new", ...row }));
  leadsRepo.insertPipelineColumns.mockImplementation((rows: Record<string, unknown>[]) =>
    Promise.resolve(rows.map((r, i) => ({ id: `c-new-${i}`, ...r }))));
  leadsRepo.insertPipelineColumn.mockImplementation((row: Record<string, unknown>) =>
    Promise.resolve({ id: "c-new", ...row }));
  leadsRepo.completeTaskRpc.mockResolvedValue(true);
  leadsRepo.reopenTaskRpc.mockResolvedValue(true);
  leadsRepo.updateTaskResultRpc.mockResolvedValue(true);
  leadsRepo.deleteColumnsByPipeline.mockResolvedValue(undefined);
  mocks.listActiveAgents.mockResolvedValue([]);
}

async function renderApp() {
  const hook = renderHook(() => useAppState(), { wrapper: AppProvider });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  await waitFor(() => expect(hook.result.current.leads).toHaveLength(LEADS.length));
  return hook;
}

type Hook = Awaited<ReturnType<typeof renderApp>>;

const ids = (list: { id: string }[]) => list.map((i) => i.id);
const leadOf = (hook: Hook, id: string) => hook.result.current.leads.find((l) => l.id === id);
const taskOf = (hook: Hook, id: string) => hook.result.current.tasks.find((t) => t.id === id);

beforeEach(() => {
  applyDefaults();
});

describe("AppContext: carga inicial", () => {
  it("popula pipelines, colunas, tarefas, timeline, automacoes e leads", async () => {
    const { result } = await renderApp();
    const s = result.current;

    expect(ids(s.pipelines)).toEqual(["p1", "p2"]);
    expect(s.pipelines[0]).toEqual({ id: "p1", client_id: "client-1", name: "Vendas", columns: [] });
    expect(ids(s.columns)).toEqual(["c1", "c2", "c3"]);
    expect(s.columns[2]).toEqual({
      id: "c3", pipeline_id: "p2", name: "Suporte", order: 0, color: undefined, description: undefined,
    });
    expect(ids(s.tasks)).toEqual(["t1", "t2", "t3"]);
    expect(ids(s.timeline)).toEqual(["e1"]);
    expect(s.automations).toEqual([]);
    expect(s.complexAutomations).toEqual([]);
    expect(ids(s.leads)).toEqual(["l1", "l2", "l3"]);
    expect(s.leads[0].category).toBe("lead");
    expect(s.leads[0].custom_fields).toEqual({});
    expect(s.currentPipelineId).toBe("p1");
    expect(s.leadCountByPipeline).toEqual({ p1: 3 });
  });

  it("consulta os services com o id do tenant e sem master view", async () => {
    await renderApp();

    for (const fn of [
      leadsRepo.listPipelines, leadsRepo.listPipelineColumns, leadsRepo.listTasks,
      leadsRepo.listTimelineEvents, automationsRepo.listComplexAutomations,
      automationsRepo.listAutomationRules, leadsRepo.countLeads,
    ]) {
      expect(fn).toHaveBeenCalledWith(TENANT_ID, false);
    }
    expect(leadsRepo.listLeadColumnIdsPage).toHaveBeenCalledWith(TENANT_ID, false, 0, 999);
    expect(leadsRepo.listLeadsPage).toHaveBeenCalledWith(TENANT_ID, false, 0, 999);
  });

  it("sem tenant usa o client_id do usuario", async () => {
    ctx.tenant = null;
    await renderApp();
    expect(leadsRepo.listPipelines).toHaveBeenCalledWith("client-1", false);
    expect(leadsRepo.listLeadsPage).toHaveBeenCalledWith("client-1", false, 0, 999);
  });

  it("master view (user master no subdominio master) consulta com flag true", async () => {
    ctx.user.role = "master";
    ctx.tenant = { id: "master", subdomain: "master" };
    await renderApp();
    expect(leadsRepo.listPipelines).toHaveBeenCalledWith("master", true);
    expect(leadsRepo.countLeads).toHaveBeenCalledWith("master", true);
  });

  it("troca para o funil com mais leads quando o primeiro esta vazio", async () => {
    leadsRepo.listLeadColumnIdsPage.mockResolvedValue([{ column_id: "c3" }, { column_id: "c3" }, { column_id: "c3" }]);
    const { result } = await renderApp();
    await waitFor(() => expect(result.current.currentPipelineId).toBe("p2"));
    expect(result.current.leadCountByPipeline).toEqual({ p2: 3 });
  });

  it("sem client_id nem tenant nao consulta nada e libera o loading", async () => {
    ctx.tenant = null;
    const original = ctx.user.client_id;
    ctx.user.client_id = "";
    try {
      const hook = renderHook(() => useAppState(), { wrapper: AppProvider });
      await waitFor(() => expect(hook.result.current.loading).toBe(false));
      expect(leadsRepo.listPipelines).not.toHaveBeenCalled();
      expect(hook.result.current.leads).toEqual([]);
    } finally {
      ctx.user.client_id = original;
    }
  });

  it("falha em um recurso nao derruba os demais", async () => {
    leadsRepo.listTasks.mockRejectedValue(new Error("boom"));
    const { result } = await renderApp();
    expect(result.current.tasks).toEqual([]);
    expect(ids(result.current.pipelines)).toEqual(["p1", "p2"]);
  });
});

describe("AppContext: leads", () => {
  it("addLead insere com client/tenant, atualiza estado, registra timeline e toast", async () => {
    const hook = await renderApp();
    let created: Awaited<ReturnType<typeof hook.result.current.addLead>> = null;
    await act(async () => {
      created = await hook.result.current.addLead({ name: "Diego", phone: "11999", tags: ["vip"] }, "c1");
    });

    expect(leadsRepo.insertLead).toHaveBeenCalledWith(expect.objectContaining({
      name: "Diego", phone: "11999", email: null, origin: "Manual", tags: ["vip"],
      column_id: "c1", client_id: TENANT_ID, tenant_id: TENANT_ID,
    }));
    expect(created).toEqual(expect.objectContaining({ id: "l-new", name: "Diego" }));
    expect(hook.result.current.leads[0].id).toBe("l-new");
    expect(hook.result.current.leads).toHaveLength(4);
    expect(leadsRepo.insertTimelineEvent).toHaveBeenCalledWith(expect.objectContaining({
      lead_id: "l-new", type: "stage_change",
      content: 'Lead "Diego" criado e adicionado ao pipeline', user_name: "Sistema",
      client_id: TENANT_ID, tenant_id: TENANT_ID, user_id: "user-1",
    }));
    expect(hook.result.current.timeline[0].content).toBe('Lead "Diego" criado e adicionado ao pipeline');
    expect(toast.success).toHaveBeenCalledWith("Lead criado com sucesso");
  });

  it("addLead sem tenant usa client_id do usuario e nao envia tenant_id", async () => {
    ctx.tenant = null;
    const hook = await renderApp();
    await act(async () => { await hook.result.current.addLead({ name: "Eva" }, "c1"); });
    const arg = leadsRepo.insertLead.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.client_id).toBe("client-1");
    expect("tenant_id" in arg).toBe(false);
  });

  it("addLead com erro devolve null, avisa e nao altera o estado", async () => {
    leadsRepo.insertLead.mockRejectedValue(new Error("falhou"));
    const hook = await renderApp();
    let created: unknown = "pendente";
    await act(async () => { created = await hook.result.current.addLead({ name: "X" }, "c1"); });
    expect(created).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("Erro ao criar lead");
    expect(mocks.logger.error).toHaveBeenCalled();
    expect(hook.result.current.leads).toHaveLength(3);
    expect(leadsRepo.insertTimelineEvent).not.toHaveBeenCalled();
  });

  it("updateLead normaliza campos, atualiza estado e registra 'Lead atualizado'", async () => {
    const hook = await renderApp();
    let ok = false;
    await act(async () => { ok = await hook.result.current.updateLead("l1", { name: "Ana Maria", phone: "", tags: ["a"] }); });

    expect(ok).toBe(true);
    expect(leadsRepo.updateLead).toHaveBeenCalledWith("l1", { name: "Ana Maria", phone: null, tags: ["a"] });
    expect(leadOf(hook, "l1")).toEqual(expect.objectContaining({ name: "Ana Maria", phone: "", tags: ["a"] }));
    expect(leadOf(hook, "l1")?.updated_at).not.toBe(NOW);
    expect(leadsRepo.insertTimelineEvent).toHaveBeenCalledWith(expect.objectContaining({
      lead_id: "l1", type: "note", content: "Lead atualizado", user_name: "Usuário",
    }));
  });

  it("updateLead so com notas nao grava evento de timeline", async () => {
    const hook = await renderApp();
    await act(async () => { await hook.result.current.updateLead("l1", { notes_local: "oi" }); });
    expect(leadsRepo.updateLead).toHaveBeenCalledWith("l1", { notes_local: "oi" });
    expect(leadsRepo.insertTimelineEvent).not.toHaveBeenCalled();
  });

  it("updateLead trocando responsavel grava evento com os nomes dos agentes", async () => {
    mocks.listActiveAgents.mockResolvedValue([{ id: "ag1", name: "Zeca" }]);
    const hook = await renderApp();
    await act(async () => { await hook.result.current.updateLead("l1", { responsible_id: "ag1" }); });
    expect(mocks.listActiveAgents).toHaveBeenCalledWith(TENANT_ID);
    expect(leadsRepo.insertTimelineEvent).toHaveBeenCalledWith(expect.objectContaining({
      lead_id: "l1", type: "note", content: "Responsável alterado: de Ninguém para Zeca",
    }));
  });

  it("updateLead com erro devolve false, avisa e mantem o estado", async () => {
    leadsRepo.updateLead.mockRejectedValue(new Error("x"));
    const hook = await renderApp();
    let ok = true;
    await act(async () => { ok = await hook.result.current.updateLead("l1", { name: "Novo" }); });
    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("Erro ao atualizar lead");
    expect(leadOf(hook, "l1")?.name).toBe("Ana");
    expect(leadsRepo.insertTimelineEvent).not.toHaveBeenCalled();
  });

  it("deleteLead remove o lead e as tarefas dele, sem tocar na timeline", async () => {
    const hook = await renderApp();
    await act(async () => { await hook.result.current.deleteLead("l1"); });

    expect(leadsRepo.bulkDeleteLeads).toHaveBeenCalledWith(["l1"]);
    expect(ids(hook.result.current.leads)).toEqual(["l2", "l3"]);
    expect(ids(hook.result.current.tasks)).toEqual(["t2", "t3"]);
    expect(ids(hook.result.current.timeline)).toEqual(["e1"]);
    expect(toast.success).toHaveBeenCalledWith("Lead excluído");
  });

  it("deleteLead com erro nao altera lead nem tarefas", async () => {
    leadsRepo.bulkDeleteLeads.mockRejectedValue(new Error("x"));
    const hook = await renderApp();
    await act(async () => { await hook.result.current.deleteLead("l1"); });
    expect(toast.error).toHaveBeenCalledWith("Erro ao excluir lead");
    expect(hook.result.current.leads).toHaveLength(3);
    expect(hook.result.current.tasks).toHaveLength(3);
  });

  it("moveLead aplica otimista, persiste, registra timeline e devolve true", async () => {
    const hook = await renderApp();
    let ok = false;
    await act(async () => { ok = await hook.result.current.moveLead("l1", "c2"); });

    expect(ok).toBe(true);
    expect(leadsRepo.updateLead).toHaveBeenCalledWith("l1", { column_id: "c2" });
    expect(leadOf(hook, "l1")?.column_id).toBe("c2");
    expect(leadsRepo.insertTimelineEvent).toHaveBeenCalledWith(expect.objectContaining({
      lead_id: "l1", type: "stage_change", content: '"Ana" movido de Novos para Qualificacao', user_name: "Usuário",
    }));
  });

  it("moveLead entre funis nomeia os funis na timeline", async () => {
    const hook = await renderApp();
    await act(async () => { await hook.result.current.moveLead("l1", "c3"); });
    expect(leadsRepo.insertTimelineEvent).toHaveBeenCalledWith(expect.objectContaining({
      content: '"Ana" movido de Novos (funil "Vendas") para Suporte (funil "Pos-venda")',
    }));
  });

  it("moveLead para a mesma coluna ou lead inexistente devolve true sem chamar service", async () => {
    const hook = await renderApp();
    let same = false;
    let missing = false;
    await act(async () => {
      same = await hook.result.current.moveLead("l1", "c1");
      missing = await hook.result.current.moveLead("nao-existe", "c2");
    });
    expect(same).toBe(true);
    expect(missing).toBe(true);
    expect(leadsRepo.updateLead).not.toHaveBeenCalled();
  });

  it("moveLead com erro faz rollback, avisa e devolve false", async () => {
    leadsRepo.updateLead.mockRejectedValue(new Error("x"));
    const hook = await renderApp();
    let ok = true;
    await act(async () => { ok = await hook.result.current.moveLead("l1", "c2"); });
    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("Erro ao mover lead");
    expect(leadOf(hook, "l1")?.column_id).toBe("c1");
    expect(leadsRepo.insertTimelineEvent).not.toHaveBeenCalled();
  });

  it("moveLeadToPipeline move para a primeira coluna do funil de destino", async () => {
    const hook = await renderApp();
    await act(async () => { await hook.result.current.moveLeadToPipeline("l1", "p2"); });
    expect(leadsRepo.updateLead).toHaveBeenCalledWith("l1", { column_id: "c3" });
    expect(leadOf(hook, "l1")?.column_id).toBe("c3");
    expect(toast.success).toHaveBeenCalledWith('Lead movido de "Vendas" para "Pos-venda"');
    expect(leadsRepo.insertTimelineEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: "stage_change", content: '"Ana" movido do funil "Vendas" para "Pos-venda"',
    }));
  });

  it("moveLeadToPipeline para funil sem colunas avisa e nao persiste", async () => {
    const hook = await renderApp();
    await act(async () => { await hook.result.current.moveLeadToPipeline("l1", "p-vazio"); });
    expect(toast.error).toHaveBeenCalledWith("Funil de destino não possui colunas");
    expect(leadsRepo.updateLead).not.toHaveBeenCalled();
  });

  it("mergeLeads reaponta conversas, tarefas e timeline antes de excluir a origem", async () => {
    const order: string[] = [];
    mocks.reassignConversationsToLead.mockImplementation(async () => { order.push("conversations"); });
    leadsRepo.reassignTasksToLead.mockImplementation(async () => { order.push("tasks"); });
    leadsRepo.reassignTimelineToLead.mockImplementation(async () => { order.push("timeline"); });
    leadsRepo.bulkDeleteLeads.mockImplementation(async () => { order.push("delete"); });

    const hook = await renderApp();
    await act(async () => { await hook.result.current.mergeLeads("l1", "l2"); });

    expect(order).toEqual(["conversations", "tasks", "timeline", "delete"]);
    expect(mocks.reassignConversationsToLead).toHaveBeenCalledWith("l1", "l2");
    expect(leadsRepo.reassignTasksToLead).toHaveBeenCalledWith("l1", "l2");
    expect(leadsRepo.reassignTimelineToLead).toHaveBeenCalledWith("l1", "l2");
    expect(leadsRepo.bulkDeleteLeads).toHaveBeenCalledWith(["l1"]);
    expect(ids(hook.result.current.leads)).toEqual(["l2", "l3"]);
    // O estado local de tarefas nao e mexido pelo merge (so o banco e reapontado).
    expect(ids(hook.result.current.tasks)).toEqual(["t1", "t2", "t3"]);
    expect(toast.success).toHaveBeenCalledWith("Leads mesclados com sucesso.");
  });

  it("mergeLeads aborta sem excluir quando o reapontamento falha", async () => {
    leadsRepo.reassignTimelineToLead.mockRejectedValue(new Error("sem permissao"));
    const hook = await renderApp();
    await act(async () => { await hook.result.current.mergeLeads("l1", "l2"); });
    expect(leadsRepo.bulkDeleteLeads).not.toHaveBeenCalled();
    expect(hook.result.current.leads).toHaveLength(3);
    expect(toast.error).toHaveBeenCalledWith("Erro ao mesclar leads: sem permissao");
  });
});

describe("AppContext: tarefas", () => {
  it("addTask insere com client/tenant/usuario, entra no topo e registra timeline do lead", async () => {
    const hook = await renderApp();
    let created: Awaited<ReturnType<typeof hook.result.current.addTask>> = null;
    await act(async () => { created = await hook.result.current.addTask({ title: "Retornar", lead_id: "l2" }); });

    expect(leadsRepo.insertTaskReturning).toHaveBeenCalledWith(expect.objectContaining({
      title: "Retornar", lead_id: "l2", assigned_to: "Você", assigned_to_id: "user-1",
      client_id: TENANT_ID, tenant_id: TENANT_ID,
    }));
    expect(created).toEqual(expect.objectContaining({ id: "t-new", title: "Retornar" }));
    expect(hook.result.current.tasks[0].id).toBe("t-new");
    expect(leadsRepo.insertTimelineEvent).toHaveBeenCalledWith(expect.objectContaining({
      lead_id: "l2", type: "task", content: "Tarefa criada: Retornar",
    }));
    expect(toast.success).toHaveBeenCalledWith("Tarefa criada");
  });

  it("addTask sem lead nao grava timeline", async () => {
    const hook = await renderApp();
    await act(async () => { await hook.result.current.addTask({ title: "Solta" }); });
    expect(leadsRepo.insertTimelineEvent).not.toHaveBeenCalled();
    expect(hook.result.current.tasks).toHaveLength(4);
  });

  it("addTask com erro devolve null e avisa", async () => {
    leadsRepo.insertTaskReturning.mockRejectedValue(new Error("x"));
    const hook = await renderApp();
    let created: unknown = "pendente";
    await act(async () => { created = await hook.result.current.addTask({ title: "T" }); });
    expect(created).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("Erro ao criar tarefa");
    expect(hook.result.current.tasks).toHaveLength(3);
  });

  it("toggleTaskStatus conclui (RPC complete) e reabre (RPC reopen) limpando completed_at", async () => {
    const hook = await renderApp();
    await act(async () => { await hook.result.current.toggleTaskStatus("t1"); });
    expect(leadsRepo.completeTaskRpc).toHaveBeenCalledWith("t1");
    expect(taskOf(hook, "t1")?.status).toBe("completed");
    expect(taskOf(hook, "t1")?.completed_at).toEqual(expect.any(String));

    await act(async () => { await hook.result.current.toggleTaskStatus("t1"); });
    expect(leadsRepo.reopenTaskRpc).toHaveBeenCalledWith("t1");
    expect(taskOf(hook, "t1")?.status).toBe("pending");
    expect(taskOf(hook, "t1")?.completed_at).toBeUndefined();
  });

  it("toggleTaskStatus faz rollback quando o RPC nao confirma", async () => {
    leadsRepo.completeTaskRpc.mockResolvedValue(false);
    const hook = await renderApp();
    await act(async () => { await hook.result.current.toggleTaskStatus("t1"); });
    expect(taskOf(hook, "t1")?.status).toBe("pending");
    expect(toast.error).toHaveBeenCalledWith("Erro ao alterar status da tarefa");
  });

  it("completeTask grava resultado aparado, atualiza estado e registra timeline do lead", async () => {
    const hook = await renderApp();
    let ok = false;
    await act(async () => { ok = await hook.result.current.completeTask("t1", "  Fechado  "); });

    expect(ok).toBe(true);
    expect(leadsRepo.completeTaskRpc).toHaveBeenCalledWith("t1", "Fechado");
    expect(taskOf(hook, "t1")).toEqual(expect.objectContaining({ status: "completed", result: "Fechado" }));
    expect(leadsRepo.insertTimelineEvent).toHaveBeenCalledWith(expect.objectContaining({
      lead_id: "l1", type: "note", content: expect.stringContaining('Tarefa concluída: "Ligar"'),
    }));
  });

  it("completeTask em tarefa ja concluida ou inexistente devolve false sem chamar service", async () => {
    const hook = await renderApp();
    let done = true;
    let missing = true;
    await act(async () => {
      done = await hook.result.current.completeTask("t3");
      missing = await hook.result.current.completeTask("nao-existe");
    });
    expect(done).toBe(false);
    expect(missing).toBe(false);
    expect(leadsRepo.completeTaskRpc).not.toHaveBeenCalled();
  });

  it("completeTask com erro faz rollback e devolve false", async () => {
    leadsRepo.completeTaskRpc.mockRejectedValue(new Error("x"));
    const hook = await renderApp();
    let ok = true;
    await act(async () => { ok = await hook.result.current.completeTask("t1", "r"); });
    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("Erro ao concluir tarefa");
    expect(taskOf(hook, "t1")?.status).toBe("pending");
  });

  it("updateTask, updateTaskResult e deleteTask", async () => {
    const hook = await renderApp();
    await act(async () => { await hook.result.current.updateTask("t1", { title: "Ligar de novo" }); });
    expect(leadsRepo.updateTaskRow).toHaveBeenCalledWith("t1", { title: "Ligar de novo" });
    expect(taskOf(hook, "t1")?.title).toBe("Ligar de novo");

    await act(async () => { await hook.result.current.updateTaskResult("t3", " ok "); });
    expect(leadsRepo.updateTaskResultRpc).toHaveBeenCalledWith("t3", "ok");
    expect(taskOf(hook, "t3")?.result).toBe("ok");

    await act(async () => { await hook.result.current.deleteTask("t2"); });
    expect(leadsRepo.deleteTaskById).toHaveBeenCalledWith("t2");
    expect(ids(hook.result.current.tasks)).toEqual(["t1", "t3"]);
    expect(toast.success).toHaveBeenCalledWith("Tarefa excluída");
  });
});

describe("AppContext: funis e colunas", () => {
  it("addColumn usa o funil atual, order = maior + 1 e client/tenant", async () => {
    const hook = await renderApp();
    await act(async () => { await hook.result.current.addColumn("Negociacao", "#ff0000"); });
    expect(leadsRepo.insertPipelineColumn).toHaveBeenCalledWith({
      name: "Negociacao", color: "#ff0000", order: 2, pipeline_id: "p1",
      client_id: TENANT_ID, tenant_id: TENANT_ID,
    });
    expect(ids(hook.result.current.columns)).toEqual(["c1", "c2", "c3", "c-new"]);
    expect(toast.success).toHaveBeenCalledWith("Coluna criada");
  });

  it("reorderColumns aplica ordem otimista e persiste uma atualizacao por coluna", async () => {
    const hook = await renderApp();
    await act(async () => { await hook.result.current.reorderColumns(["c2", "c1"]); });
    expect(leadsRepo.updatePipelineColumn).toHaveBeenCalledWith("c2", { order: 0 });
    expect(leadsRepo.updatePipelineColumn).toHaveBeenCalledWith("c1", { order: 1 });
    const byId = Object.fromEntries(hook.result.current.columns.map((c) => [c.id, c.order]));
    expect(byId).toEqual({ c1: 1, c2: 0, c3: 0 });
  });

  it("reorderColumns com falha recarrega todas as colunas do banco", async () => {
    leadsRepo.updatePipelineColumn.mockRejectedValue(new Error("x"));
    leadsRepo.listAllPipelineColumns.mockResolvedValue([COLUMNS[0]]);
    const hook = await renderApp();
    await act(async () => { await hook.result.current.reorderColumns(["c2", "c1"]); });
    expect(toast.error).toHaveBeenCalledWith("Erro ao salvar nova ordem. Recarregando...");
    expect(leadsRepo.listAllPipelineColumns).toHaveBeenCalled();
    expect(ids(hook.result.current.columns)).toEqual(["c1"]);
  });

  it("updateColumn e deleteColumn devolvem true e atualizam o estado", async () => {
    const hook = await renderApp();
    let upd = false;
    let del = false;
    await act(async () => { upd = await hook.result.current.updateColumn("c1", { name: "Entrada" }); });
    expect(upd).toBe(true);
    expect(leadsRepo.updatePipelineColumn).toHaveBeenCalledWith("c1", { name: "Entrada" });
    expect(hook.result.current.columns[0].name).toBe("Entrada");
    await act(async () => { del = await hook.result.current.deleteColumn("c2"); });
    expect(del).toBe(true);
    expect(leadsRepo.deletePipelineColumn).toHaveBeenCalledWith("c2");
    expect(ids(hook.result.current.columns)).toEqual(["c1", "c3"]);
  });

  it("addPipeline cria funil, seleciona e cria 3 colunas padrao", async () => {
    const hook = await renderApp();
    await act(async () => { await hook.result.current.addPipeline("Novo"); });
    expect(leadsRepo.insertPipeline).toHaveBeenCalledWith({ name: "Novo", client_id: TENANT_ID, tenant_id: TENANT_ID });
    expect(hook.result.current.currentPipelineId).toBe("p-new");
    expect(ids(hook.result.current.pipelines)).toEqual(["p1", "p2", "p-new"]);
    const cols = leadsRepo.insertPipelineColumns.mock.calls[0][0] as { name: string; pipeline_id: string }[];
    expect(cols.map((c) => c.name)).toEqual(["Novos Leads", "Qualificação", "Fechamento"]);
    expect(cols.every((c) => c.pipeline_id === "p-new")).toBe(true);
    expect(hook.result.current.columns).toHaveLength(6);
    expect(toast.success).toHaveBeenCalledWith("Funil criado com sucesso");
  });

  it("deletePipeline remove funil e colunas e troca o funil atual", async () => {
    const hook = await renderApp();
    await act(async () => { await hook.result.current.deletePipeline("p1"); });
    expect(leadsRepo.deleteColumnsByPipeline).toHaveBeenCalledWith("p1");
    expect(leadsRepo.deletePipelineById).toHaveBeenCalledWith("p1");
    expect(ids(hook.result.current.pipelines)).toEqual(["p2"]);
    expect(ids(hook.result.current.columns)).toEqual(["c3"]);
    expect(hook.result.current.currentPipelineId).toBe("p2");
  });

  it("setPipeline e updatePipeline", async () => {
    const hook = await renderApp();
    act(() => { hook.result.current.setPipeline("p2"); });
    expect(hook.result.current.currentPipelineId).toBe("p2");
    await act(async () => { await hook.result.current.updatePipeline("p2", { name: "Renomeado" }); });
    expect(leadsRepo.updatePipeline).toHaveBeenCalledWith("p2", { name: "Renomeado" });
    expect(hook.result.current.pipelines[1].name).toBe("Renomeado");
  });
});

describe("AppContext: timeline e automacoes", () => {
  it("addTimelineEvent insere e coloca o evento no topo", async () => {
    const hook = await renderApp();
    await act(async () => {
      await hook.result.current.addTimelineEvent({ lead_id: "l1", type: "note", content: "x", user_name: "Eu" });
    });
    expect(leadsRepo.insertTimelineEvent).toHaveBeenCalledWith({
      lead_id: "l1", type: "note", content: "x", user_name: "Eu",
      user_id: "user-1", client_id: TENANT_ID, tenant_id: TENANT_ID,
    });
    expect(hook.result.current.timeline[0].content).toBe("x");
    expect(hook.result.current.timeline).toHaveLength(2);
  });

  it("addBasicAutomation, toggleBasicAutomation, updateBasicAutomation e deleteBasicAutomation", async () => {
    automationsRepo.insertAutomationRule.mockImplementation((row: Record<string, unknown>) =>
      Promise.resolve({ id: "r-new", ...row }));
    const hook = await renderApp();

    await act(async () => { await hook.result.current.addBasicAutomation({ name: "Regra" }); });
    expect(automationsRepo.insertAutomationRule).toHaveBeenCalledWith(expect.objectContaining({
      client_id: TENANT_ID, pipeline_id: "p1", name: "Regra", active: true,
      trigger: { type: "card_entered" }, actions: [], exceptions: [], tenant_id: TENANT_ID,
    }));
    expect(ids(hook.result.current.automations)).toEqual(["r-new"]);

    await act(async () => { await hook.result.current.toggleBasicAutomation("r-new"); });
    expect(automationsRepo.updateAutomationRule).toHaveBeenCalledWith("r-new", { active: false });
    expect(hook.result.current.automations[0].active).toBe(false);

    await act(async () => { await hook.result.current.updateBasicAutomation("r-new", { name: "Outra" }); });
    expect(automationsRepo.updateAutomationRule).toHaveBeenCalledWith("r-new", { name: "Outra" });
    expect(hook.result.current.automations[0].name).toBe("Outra");

    await act(async () => { await hook.result.current.deleteBasicAutomation("r-new"); });
    expect(automationsRepo.deleteAutomationRule).toHaveBeenCalledWith("r-new");
    expect(hook.result.current.automations).toEqual([]);
  });

  it("createAutomation, updateAutomationNodes, toggleComplexAutomation e deleteAutomation", async () => {
    automationsRepo.insertComplexAutomation.mockImplementation((row: Record<string, unknown>) =>
      Promise.resolve({ id: "a-new", ...row }));
    const hook = await renderApp();

    let newId: string | null = null;
    await act(async () => { newId = await hook.result.current.createAutomation("Fluxo"); });
    expect(newId).toBe("a-new");
    expect(automationsRepo.insertComplexAutomation).toHaveBeenCalledWith({
      client_id: TENANT_ID, name: "Fluxo", status: "draft", nodes: [], edges: [], tenant_id: TENANT_ID,
    });

    await act(async () => { await hook.result.current.updateAutomationNodes("a-new", [], []); });
    expect(automationsRepo.updateComplexAutomation).toHaveBeenCalledWith("a-new", {
      nodes: [], edges: [], updated_at: expect.any(String),
    });
    expect(toast.success).toHaveBeenCalledWith("Fluxo salvo com sucesso!");

    await act(async () => { await hook.result.current.toggleComplexAutomation("a-new"); });
    expect(automationsRepo.updateComplexAutomation).toHaveBeenCalledWith("a-new", { status: "active" });
    expect(hook.result.current.complexAutomations[0].status).toBe("active");

    await act(async () => { await hook.result.current.deleteAutomation("a-new"); });
    expect(automationsRepo.deleteComplexAutomation).toHaveBeenCalledWith("a-new");
    expect(hook.result.current.complexAutomations).toEqual([]);
  });
});

describe("AppContext: motor de automacoes (efeitos entre dominios)", () => {
  const rule = (overrides: Record<string, unknown>) => ({
    id: "r1", client_id: "client-1", pipeline_id: "p1", column_id: null, name: "Regra",
    active: true, trigger: { type: "stage_changed" }, actions: [], exceptions: [], ...overrides,
  });

  it("moveLead dispara regra stage_changed (add_tag) e registra evento de automacao", async () => {
    automationsRepo.listAutomationRules.mockResolvedValue([rule({
      column_id: "c2", name: "Tag ao entrar",
      actions: [{ type: "add_tag", config: { tag: "quente" } }],
    })]);
    const hook = await renderApp();
    await act(async () => { await hook.result.current.moveLead("l1", "c2"); });

    expect(leadsRepo.updateLead).toHaveBeenCalledWith("l1", { column_id: "c2" });
    expect(leadsRepo.updateLead).toHaveBeenCalledWith("l1", { tags: ["quente"] });
    expect(leadOf(hook, "l1")).toEqual(expect.objectContaining({ column_id: "c2", tags: ["quente"] }));
    expect(leadsRepo.insertTimelineEvent).toHaveBeenCalledWith(expect.objectContaining({
      lead_id: "l1", type: "automation", content: "Automação executada: Tag ao entrar", user_name: "Sistema",
    }));
  });

  it("regra com excecao has_tag nao executa", async () => {
    automationsRepo.listAutomationRules.mockResolvedValue([rule({
      column_id: "c2",
      actions: [{ type: "add_tag", config: { tag: "quente" } }],
      exceptions: [{ type: "has_tag", config: { tag: "nao-mexer" } }],
    })]);
    leadsRepo.listLeadsPage.mockResolvedValue([{ ...LEADS[0], tags: ["nao-mexer"] }, LEADS[1], LEADS[2]]);
    const hook = await renderApp();
    await act(async () => { await hook.result.current.moveLead("l1", "c2"); });
    expect(leadsRepo.updateLead).not.toHaveBeenCalledWith("l1", expect.objectContaining({ tags: expect.anything() }));
    expect(leadsRepo.insertTimelineEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: "automation" }));
  });

  it("moveLead aciona a automacao complexa ativa uma unica vez (status_change)", async () => {
    automationsRepo.listComplexAutomations.mockResolvedValue([{
      id: "a1", client_id: "client-1", name: "Fluxo", status: "active", created_at: NOW, updated_at: NOW,
      nodes: [{ id: "n1", type: "trigger", data: { type: "status_change" } }, { id: "n2", type: "action", data: {} }],
      edges: [],
    }]);
    const hook = await renderApp();
    await act(async () => { await hook.result.current.moveLead("l1", "c2"); });
    expect(automationsRepo.triggerAutomationEngine).toHaveBeenCalledTimes(1);
    expect(automationsRepo.triggerAutomationEngine).toHaveBeenCalledWith({
      automation_id: "a1", lead_id: "l1", node_id: "n1", context: { column_id: "c2" },
    });
  });

  it("automacao complexa em rascunho nao e acionada", async () => {
    automationsRepo.listComplexAutomations.mockResolvedValue([{
      id: "a1", client_id: "client-1", name: "Fluxo", status: "draft", created_at: NOW, updated_at: NOW,
      nodes: [{ id: "n1", type: "trigger", data: { type: "status_change" } }], edges: [],
    }]);
    const hook = await renderApp();
    await act(async () => { await hook.result.current.moveLead("l1", "c2"); });
    expect(automationsRepo.triggerAutomationEngine).not.toHaveBeenCalled();
  });

  it("addLead dispara automacao complexa new_lead", async () => {
    automationsRepo.listComplexAutomations.mockResolvedValue([{
      id: "a2", client_id: "client-1", name: "Boas-vindas", status: "active", created_at: NOW, updated_at: NOW,
      nodes: [{ id: "n9", type: "trigger", data: { type: "new_lead" } }], edges: [],
    }]);
    const hook = await renderApp();
    await act(async () => { await hook.result.current.addLead({ name: "Fabio" }, "c1"); });
    expect(automationsRepo.triggerAutomationEngine).toHaveBeenCalledTimes(1);
    expect(automationsRepo.triggerAutomationEngine).toHaveBeenCalledWith({
      automation_id: "a2", lead_id: "l-new", node_id: "n9", context: {},
    });
  });
});

describe("AppContext: refreshData", () => {
  it("refaz a carga completa e substitui o estado pelos dados novos", async () => {
    const hook = await renderApp();
    expect(leadsRepo.listPipelines).toHaveBeenCalledTimes(1);

    leadsRepo.listTasks.mockResolvedValue([taskRow("t9", "Nova", null, "pending")]);
    leadsRepo.countLeads.mockResolvedValue(1);
    leadsRepo.listLeadColumnIdsPage.mockResolvedValue([{ column_id: "c1" }]);
    leadsRepo.listLeadsPage.mockResolvedValue([leadRow("l9", "Zoe", "c1")]);

    await act(async () => { await hook.result.current.refreshData(); });

    expect(leadsRepo.listPipelines).toHaveBeenCalledTimes(2);
    expect(leadsRepo.listPipelines).toHaveBeenLastCalledWith(TENANT_ID, false);
    expect(ids(hook.result.current.tasks)).toEqual(["t9"]);
    await waitFor(() => expect(ids(hook.result.current.leads)).toEqual(["l9"]));
    expect(hook.result.current.leadCountByPipeline).toEqual({ p1: 1 });
  });
});
