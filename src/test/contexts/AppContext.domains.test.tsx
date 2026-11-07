/**
 * Isolamento dos contextos por dominio: uma mudanca em tarefas nao pode trocar
 * o valor do contexto de leads (e vice-versa), e a fachada useAppState precisa
 * continuar devolvendo a forma completa de AppState.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  leadsRepo: {
    listPipelines: vi.fn(), listPipelineColumns: vi.fn(), listTasks: vi.fn(), listTimelineEvents: vi.fn(),
    countLeads: vi.fn(), listLeadColumnIdsPage: vi.fn(), listLeadsPage: vi.fn(),
    insertTimelineEvent: vi.fn(), insertTaskReturning: vi.fn(), updateTaskRow: vi.fn(), updateLead: vi.fn(),
    completeTaskRpc: vi.fn(), reopenTaskRpc: vi.fn(),
    bulkDeleteLeads: vi.fn(),
  },
  automationsRepo: {
    listComplexAutomations: vi.fn(), listAutomationRules: vi.fn(), triggerAutomationEngine: vi.fn(),
  },
  ctx: {
    user: { id: "user-1", client_id: "client-1", role: "admin" },
    tenant: { id: "11111111-1111-4111-8111-111111111111", subdomain: "acme" },
  },
}));

vi.mock("@/integrations/supabase/client", async () =>
  (await import("@/test/helpers/supabaseMock")).supabaseModuleMock());
vi.mock("@/services/leads", () => mocks.leadsRepo);
vi.mock("@/services/automations", () => mocks.automationsRepo);
vi.mock("@/services/users", () => ({ listActiveAgents: vi.fn().mockResolvedValue([]) }));
vi.mock("@/services/inbox", () => ({ reassignConversationsToLead: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mocks.ctx.user }) }));
vi.mock("@/contexts/TenantContext", () => ({ useTenant: () => ({ tenant: mocks.ctx.tenant }) }));

import {
  AppProvider, useAppState, useLeadsState, useTasksState, useAutomationsState, usePipelinesState,
  useTimelineState, useAppDataState,
} from "@/contexts/AppContext";

const { leadsRepo, automationsRepo } = mocks;
const NOW = "2026-01-01T00:00:00.000Z";

beforeEach(() => {
  for (const fn of [...Object.values(leadsRepo), ...Object.values(automationsRepo)]) fn.mockReset();
  leadsRepo.listPipelines.mockResolvedValue([{ id: "p1", client_id: "client-1", name: "Vendas" }]);
  leadsRepo.listPipelineColumns.mockResolvedValue([
    { id: "c1", pipeline_id: "p1", name: "Novos", order: 0, color: null, description: null },
    { id: "c2", pipeline_id: "p1", name: "Fim", order: 1, color: null, description: null },
  ]);
  leadsRepo.listTasks.mockResolvedValue([
    { id: "t1", client_id: "client-1", lead_id: null, title: "Ligar", status: "pending", created_at: NOW },
  ]);
  leadsRepo.listTimelineEvents.mockResolvedValue([]);
  leadsRepo.countLeads.mockResolvedValue(1);
  leadsRepo.listLeadColumnIdsPage.mockResolvedValue([{ column_id: "c1" }]);
  leadsRepo.listLeadsPage.mockResolvedValue([
    { id: "l1", client_id: "client-1", name: "Ana", column_id: "c1", tags: [], created_at: NOW, updated_at: NOW },
  ]);
  leadsRepo.insertTimelineEvent.mockImplementation((row: Record<string, unknown>) =>
    Promise.resolve({ id: "tl", created_at: NOW, ...row }));
  leadsRepo.insertTaskReturning.mockImplementation((row: Record<string, unknown>) =>
    Promise.resolve({ id: "t-new", status: "pending", created_at: NOW, ...row }));
  leadsRepo.completeTaskRpc.mockResolvedValue(true);
  leadsRepo.reopenTaskRpc.mockResolvedValue(true);
  automationsRepo.listComplexAutomations.mockResolvedValue([]);
  automationsRepo.listAutomationRules.mockResolvedValue([]);
  automationsRepo.triggerAutomationEngine.mockImplementation(() => Promise.resolve());
});

async function renderDomains() {
  const hook = renderHook(() => ({
    pipelines: usePipelinesState(),
    leads: useLeadsState(),
    tasks: useTasksState(),
    automations: useAutomationsState(),
    timeline: useTimelineState(),
    data: useAppDataState(),
    all: useAppState(),
  }), { wrapper: AppProvider });
  await waitFor(() => expect(hook.result.current.data.loading).toBe(false));
  await waitFor(() => expect(hook.result.current.leads.leads).toHaveLength(1));
  return hook;
}

describe("AppContext: contextos por dominio", () => {
  it("mudar tarefas nao troca o valor dos contextos de leads, funis e automacoes", async () => {
    const hook = await renderDomains();
    const before = hook.result.current;

    await act(async () => { await hook.result.current.tasks.addTask({ title: "Nova" }); });

    const after = hook.result.current;
    expect(after.tasks).not.toBe(before.tasks);
    expect(after.tasks.tasks).toHaveLength(2);
    expect(after.leads).toBe(before.leads);
    expect(after.pipelines).toBe(before.pipelines);
    expect(after.automations).toBe(before.automations);
  });

  it("alternar o status de uma tarefa tambem nao afeta leads", async () => {
    const hook = await renderDomains();
    const before = hook.result.current;
    await act(async () => { await hook.result.current.tasks.toggleTaskStatus("t1"); });
    expect(hook.result.current.tasks).not.toBe(before.tasks);
    expect(hook.result.current.leads).toBe(before.leads);
  });

  it("mover um lead troca leads e nao troca tarefas nem funis", async () => {
    const hook = await renderDomains();
    const before = hook.result.current;
    await act(async () => { await hook.result.current.leads.moveLead("l1", "c2"); });

    const after = hook.result.current;
    expect(after.leads).not.toBe(before.leads);
    expect(after.leads.leads[0].column_id).toBe("c2");
    expect(after.tasks).toBe(before.tasks);
    expect(after.pipelines).toBe(before.pipelines);
  });

  it("sem mudanca de estado os valores permanecem estaveis entre renders", async () => {
    const hook = await renderDomains();
    const before = hook.result.current;
    hook.rerender();
    expect(hook.result.current.leads).toBe(before.leads);
    expect(hook.result.current.tasks).toBe(before.tasks);
    expect(hook.result.current.all).toBe(before.all);
  });

  it("a fachada useAppState junta todos os dominios na forma completa", async () => {
    const hook = await renderDomains();
    const { all, pipelines, leads, tasks, automations, timeline, data } = hook.result.current;
    const expectedKeys = [
      ...Object.keys(pipelines), ...Object.keys(leads), ...Object.keys(tasks),
      ...Object.keys(automations), ...Object.keys(timeline), ...Object.keys(data),
    ].sort();
    expect(Object.keys(all).sort()).toEqual(expectedKeys);
    expect(new Set(expectedKeys).size).toBe(expectedKeys.length);
    expect(Object.keys(all)).toHaveLength(40);
    expect(all.leads).toBe(leads.leads);
    expect(all.tasks).toBe(tasks.tasks);
    expect(all.addTask).toBe(tasks.addTask);
    expect(all.refreshData).toBe(data.refreshData);
    expect(all.setPipeline).toBe(pipelines.setPipeline);
  });

  it("os hooks lancam erro fora do AppProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => renderHook(() => useAppState())).toThrow("useAppState must be used within AppProvider");
      expect(() => renderHook(() => useLeadsState())).toThrow("useLeadsState must be used within AppProvider");
      expect(() => renderHook(() => useTasksState())).toThrow("useTasksState must be used within AppProvider");
    } finally {
      spy.mockRestore();
    }
  });
});
