import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

// Regressão do fix do #122: a página lia stage.stage e activity.description,
// campos que a RPC dashboard_kpis não devolve. Nome da etapa e texto da
// atividade apareciam vazios em produção.
vi.mock("@/hooks/useDashboardKpis", () => ({
  useDashboardKpis: () => ({
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    data: {
      stats: { total_leads: 3, leads_30d: 3, won: 0, lost: 0, in_progress: 3, new_leads: 3, tasks_pending: 0, tasks_overdue: 0 },
      pipeline: [{ column_id: "c1", name: "Qualificação", color: "#000", order: 0, count: 3 }],
      leads_by_month: [],
      leads_by_origin: [],
      recent_activity: [{ type: "note", content: "Ligou para a Maria", created_at: new Date().toISOString(), user_name: "Ana" }],
      pending_tasks: [],
    },
  }),
}));
vi.mock("@/contexts/AppContext", () => ({ useTasksState: () => ({ tasks: [] }) }));
vi.mock("@/components/layout/AppLayout", () => ({ AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/dashboard/DashboardCharts", () => ({ LeadsByOriginChart: () => null, LeadsByPeriodChart: () => null }));

import DashboardGeneralPage from "@/pages/DashboardGeneralPage";

describe("DashboardGeneralPage", () => {
  it("mostra o nome da etapa do pipeline e o texto da atividade recente", () => {
    render(<MemoryRouter><DashboardGeneralPage /></MemoryRouter>);
    expect(screen.getByText("Qualificação")).toBeInTheDocument();
    expect(screen.getByText("Ligou para a Maria")).toBeInTheDocument();
  });
});
