import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { mockSupabase } from "../helpers/supabaseMock";

const deleteLead = vi.fn(async () => {});

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase.client }));

vi.mock("@/contexts/AppContext", () => ({
  useAppState: () => ({
    leads: [{ id: "lead-1", name: "Maria" }],
    deleteLead,
    mergeLeads: vi.fn(),
  }),
}));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));
vi.mock("@/components/crm/MergeLeadsModal", () => ({ MergeLeadsModal: () => null }));

import { LeadDetailActions } from "@/components/crm/LeadDetail";

function renderActions(onClose = vi.fn()) {
  render(
    <MemoryRouter>
      <LeadDetailActions leadId="lead-1" onClose={onClose} />
    </MemoryRouter>
  );
  return { onClose };
}

beforeEach(() => deleteLead.mockClear());

describe("BUG-024: excluir lead pede confirmação", () => {
  it("clicar em Excluir não apaga, só abre a confirmação", async () => {
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: /excluir/i }));
    expect(await screen.findByText("Excluir lead?")).toBeInTheDocument();
    expect(deleteLead).not.toHaveBeenCalled();
  });

  it("cancelar não apaga", async () => {
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: /excluir/i }));
    fireEvent.click(await screen.findByRole("button", { name: /cancelar/i }));
    await waitFor(() => expect(screen.queryByText("Excluir lead?")).not.toBeInTheDocument());
    expect(deleteLead).not.toHaveBeenCalled();
  });

  it("confirmar apaga o lead certo e fecha", async () => {
    const { onClose } = renderActions();
    fireEvent.click(screen.getByRole("button", { name: /excluir/i }));
    await screen.findByText("Excluir lead?");
    const confirm = screen.getAllByRole("button", { name: /^excluir$/i }).at(-1)!;
    fireEvent.click(confirm);
    await waitFor(() => expect(deleteLead).toHaveBeenCalledWith("lead-1"));
    expect(onClose).toHaveBeenCalled();
  });
});
