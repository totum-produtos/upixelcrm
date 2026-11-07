import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockSupabase } from "../helpers/supabaseMock";

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase.client }));
vi.mock("@/lib/supabase-untyped", () => ({
  untypedFrom: (t: string) => mockSupabase.client.from(t),
  untypedRpc: (fn: string, a?: Record<string, unknown>) => mockSupabase.client.rpc(fn, a),
}));

import { getDashboardKpis, getCsatStats, getSlaMetrics } from "@/services/metrics";

const START = new Date("2026-01-01T00:00:00.000Z");
const END = new Date("2026-02-01T00:00:00.000Z");

beforeEach(() => mockSupabase.reset());

describe("services/metrics - getDashboardKpis", () => {
  it("passa p_client_id do tenant atual para a RPC", async () => {
    mockSupabase.respondRpc("dashboard_kpis", { data: { total: 1 } });
    expect(await getDashboardKpis("t-1")).toEqual({ total: 1 });
    expect(mockSupabase.rpcCalls()).toEqual([{ fn: "dashboard_kpis", args: { p_client_id: "t-1" } }]);
  });

  it("sem clientId chama a RPC com objeto vazio (cai no perfil logado)", async () => {
    await getDashboardKpis();
    expect(mockSupabase.rpcCalls()).toEqual([{ fn: "dashboard_kpis", args: {} }]);
  });

  it("propaga erro da RPC", async () => {
    mockSupabase.respondRpc("dashboard_kpis", { error: new Error("kpi") });
    await expect(getDashboardKpis("t-1")).rejects.toThrow("kpi");
  });
});

describe("services/metrics - getCsatStats", () => {
  it("envia datas ISO e devolve data", async () => {
    mockSupabase.respondRpc("csat_stats", { data: { avg: 4.5 } });
    expect(await getCsatStats(START, END)).toEqual({ avg: 4.5 });
    expect(mockSupabase.rpcCalls()).toEqual([
      { fn: "csat_stats", args: { p_start: START.toISOString(), p_end: END.toISOString() } },
    ]);
  });

  it("propaga erro da RPC", async () => {
    mockSupabase.respondRpc("csat_stats", { error: new Error("csat") });
    await expect(getCsatStats(START, END)).rejects.toThrow("csat");
  });
});

describe("services/metrics - getSlaMetrics", () => {
  it("chama as duas RPCs com o mesmo periodo e combina o resultado", async () => {
    mockSupabase.respondRpc("sla_metrics", { data: { o: 1 } });
    mockSupabase.respondRpc("sla_metrics_by_agent", { data: [{ a: 1 }] });
    expect(await getSlaMetrics("s", "e")).toEqual({ overall: { o: 1 }, agents: [{ a: 1 }] });
    expect(mockSupabase.rpcCalls()).toEqual([
      { fn: "sla_metrics", args: { p_start: "s", p_end: "e" } },
      { fn: "sla_metrics_by_agent", args: { p_start: "s", p_end: "e" } },
    ]);
  });

  it("aceita periodo nulo (sem filtro)", async () => {
    await getSlaMetrics(null, null);
    expect(mockSupabase.rpcCalls()[0].args).toEqual({ p_start: null, p_end: null });
  });

  it("erro na RPC geral propaga", async () => {
    mockSupabase.respondRpc("sla_metrics", { error: new Error("overall") });
    await expect(getSlaMetrics(null, null)).rejects.toThrow("overall");
  });

  it("erro na RPC por agente propaga", async () => {
    mockSupabase.respondRpc("sla_metrics_by_agent", { error: new Error("agents") });
    await expect(getSlaMetrics(null, null)).rejects.toThrow("agents");
  });
});
