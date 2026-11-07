import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { mockSupabase } from "../helpers/supabaseMock";

const TENANT_ID = "11111111-2222-4333-8444-555555555555";

const refreshData = vi.fn(async () => {});

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase.client }));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/contexts/AppContext", () => ({
  useAppState: () => ({
    pipelines: [{ id: "p1", name: "Vendas" }],
    columns: [{ id: "c1", pipeline_id: "p1", name: "Novo", order: 0 }],
    leads: [],
    refreshData,
  }),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", client_id: TENANT_ID } }),
}));
vi.mock("@/contexts/TenantContext", () => ({
  useTenant: () => ({ tenant: { id: TENANT_ID } }),
}));
vi.mock("@/hooks/useCustomFields", () => ({
  useCustomFields: () => ({
    definitions: [],
    createField: vi.fn(),
    fetchDefinitions: vi.fn(async () => {}),
  }),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

import ImportPage from "@/pages/ImportPage";

const CSV = [
  "name,phone,email",
  "Ana,11 98765-4321,ana@x.com",
  "Bia,(21) 99999-1111,bia@x.com",
  ",11 90000-0000,sem-nome@x.com",
].join("\n");

function renderPage() {
  return render(
    <MemoryRouter>
      <ImportPage />
    </MemoryRouter>
  );
}

function uploadCsv(container: HTMLElement, content: string) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([content], "leads.csv", { type: "text/csv" });
  fireEvent.change(input, { target: { files: [file] } });
}

async function goToMapping(container: HTMLElement) {
  uploadCsv(container, CSV);
  await screen.findByText("3 registros");
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  await screen.findByText("Mapeamento de Colunas");
}

beforeEach(() => {
  mockSupabase.reset();
  refreshData.mockClear();
  mockSupabase.respond("leads", { data: [], error: null });
  mockSupabase.respond("custom_field_definitions", { data: [], error: null });
});

describe("ImportPage (smoke, rede de segurança do refactor)", () => {
  it("mostra o upload, detecta colunas e a contagem de linhas", async () => {
    const { container } = renderPage();
    expect(screen.getByText("Arraste seu arquivo aqui")).toBeInTheDocument();

    uploadCsv(container, CSV);

    expect(await screen.findByText("leads.csv")).toBeInTheDocument();
    expect(screen.getByText("3 registros")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(await screen.findByText("Mapeamento de Colunas")).toBeInTheDocument();
  });

  it("confirmar importa as linhas válidas com client_id e tenant_id", async () => {
    const { container } = renderPage();
    await goToMapping(container);

    fireEvent.click(screen.getByRole("button", { name: "Importar Leads" }));

    expect(await screen.findByText("Importação Concluída!")).toBeInTheDocument();

    const insertCall = mockSupabase.callsFor("leads").find(([m]) => m === "insert");
    expect(insertCall).toBeDefined();
    const payload = insertCall![1] as Array<Record<string, unknown>>;
    expect(payload).toHaveLength(2);
    expect(payload.map((p) => p.name)).toEqual(["Ana", "Bia"]);
    for (const p of payload) {
      expect(p.client_id).toBe(TENANT_ID);
      expect(p.tenant_id).toBe(TENANT_ID);
      expect(p.column_id).toBe("c1");
      expect(p.origin).toBe("Importação");
    }
    expect(payload[0]).toMatchObject({ phone: "11 98765-4321", email: "ana@x.com", tags: [] });
    await waitFor(() => expect(refreshData).toHaveBeenCalledTimes(1));
    // 1 linha sem nome é ignorada
    expect(screen.getByText(/sem nome/)).toBeInTheDocument();
  });

  it("abre o modal de campo personalizado a partir de uma coluna não mapeada", async () => {
    const { container } = renderPage();
    await goToMapping(container);
    // "email" é mapeada automaticamente; nenhuma coluna sobra, então usa "Novo Campo"
    fireEvent.click(screen.getByRole("button", { name: /novo campo/i }));
    expect(await screen.findByText("Criar Campo Personalizado")).toBeInTheDocument();
  });

  it("ignora telefone que já existe na base (dedup)", async () => {
    mockSupabase.respond("leads", { data: [{ phone: "+55 11 9 8765-4321" }], error: null });
    const { container } = renderPage();
    await goToMapping(container);
    fireEvent.click(screen.getByRole("button", { name: "Importar Leads" }));
    await screen.findByText("Importação Concluída!");

    const insertCall = mockSupabase.callsFor("leads").find(([m]) => m === "insert");
    const payload = insertCall![1] as Array<Record<string, unknown>>;
    expect(payload.map((p) => p.name)).toEqual(["Bia"]);
    expect(screen.getByText(/com telefone já existente na base/)).toBeInTheDocument();
  });
});
