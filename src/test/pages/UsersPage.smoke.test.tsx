import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

import { mockSupabase } from "../helpers/supabaseMock";

// Rede de segurança da refatoração de UsersPage: fixa o comportamento observável.
// A página não chama src/services/users.ts; fala direto com o cliente Supabase,
// por isso o contrato do tenant é verificado nas chamadas do cliente mockado.

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase.client }));
vi.mock("@/services/users", () => ({}));
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const TENANT_ID = "tenant-1";

const authState: { user: Record<string, unknown> } = { user: {} };
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: authState.user }) }));
vi.mock("@/contexts/TenantContext", () => ({ useTenant: () => ({ tenant: { id: TENANT_ID } }) }));
vi.mock("@/hooks/usePermissions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/usePermissions")>();
  return { ...actual, usePermissions: () => ({ hasPermission: () => true }) };
});

import UsersPage from "@/pages/UsersPage";

const profile = (over: Record<string, unknown>) => ({
  client_id: TENANT_ID,
  tenant_id: TENANT_ID,
  organization_id: null,
  is_blocked: false,
  approval_status: "approved",
  created_at: "2026-01-01T00:00:00Z",
  ...over,
});

const PROFILES = [
  profile({ id: "u-admin", name: "Ana Admin", email: "ana@acme.com", role: "supervisor" }),
  profile({ id: "u-vend", name: "Bruno Vendedor", email: "bruno@acme.com", role: "vendedor" }),
  profile({ id: "u-pend", name: "Carla Pendente", email: "carla@acme.com", role: "atendente", approval_status: "pending" }),
];

function setUser(role: string) {
  authState.user = { id: "u-admin", name: "Ana Admin", role, tenant_id: TENANT_ID, organization_id: null };
}

function renderPage() {
  render(
    <MemoryRouter>
      <UsersPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockSupabase.reset();
  mockSupabase.respond("profiles", { data: PROFILES, error: null });
  mockSupabase.respond("organizations", { data: [{ id: "org-1", name: "Org Um", slug: "org-um", owner_id: "u-admin", created_at: "2026-01-01T00:00:00Z" }], error: null });
  mockSupabase.respond("audit_log", { data: [], error: null });
});

describe("UsersPage (smoke) como supervisor do tenant", () => {
  beforeEach(() => setUser("supervisor"));

  it("lista usuários com nome, e-mail e role", async () => {
    renderPage();
    expect(await screen.findByText("Bruno Vendedor")).toBeInTheDocument();
    expect(screen.getByText("Ana Admin")).toBeInTheDocument();
    expect(screen.getByText("bruno@acme.com")).toBeInTheDocument();
    expect(screen.getByText("ana@acme.com")).toBeInTheDocument();
    expect(screen.getByText("vendedor")).toBeInTheDocument();
    expect(screen.getByText("atendente")).toBeInTheDocument();
    expect(screen.getByText("Pendente")).toBeInTheDocument();
  });

  it("consulta profiles e audit_log filtrando pelo tenant", async () => {
    renderPage();
    await screen.findByText("Bruno Vendedor");
    expect(mockSupabase.callsFor("profiles")).toContainEqual(["eq", "tenant_id", TENANT_ID]);
    await waitFor(() =>
      expect(mockSupabase.callsFor("audit_log")).toContainEqual(["eq", "tenant_id", TENANT_ID])
    );
    // não-master nunca lê organizations
    expect(mockSupabase.callsFor("organizations")).toHaveLength(0);
  });

  it("supervisor não vê aprovar nem criar usuário, mas vê mudar permissão e bloquear", async () => {
    renderPage();
    await screen.findByText("Bruno Vendedor");
    expect(screen.queryByRole("button", { name: /aprovar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /novo usuário/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /deletar/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /mudar permissão/i })).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: /bloquear/i })).toHaveLength(2);
  });

  it("abre o modal de edição de role e salva via rpc de supervisor", async () => {
    renderPage();
    await screen.findByText("Bruno Vendedor");
    fireEvent.click(screen.getAllByRole("button", { name: /mudar permissão/i })[1]);
    expect(await screen.findByText("Alterar Permissão")).toBeInTheDocument();
    expect(screen.getByText("Nível de Permissão")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /salvar acesso/i }));
    await waitFor(() =>
      expect(mockSupabase.rpcCalls()).toContainEqual({
        fn: "supervisor_set_role",
        args: { target_user_id: "u-vend", new_role: "vendedor" },
      })
    );
  });

  it("bloquear usa a rpc de supervisor", async () => {
    renderPage();
    await screen.findByText("Bruno Vendedor");
    fireEvent.click(screen.getAllByRole("button", { name: /^bloquear$/i })[0]);
    await waitFor(() => expect(mockSupabase.rpcCalls().map((c) => c.fn)).toContain("supervisor_toggle_block"));
  });
});

describe("UsersPage (smoke) como master", () => {
  beforeEach(() => setUser("master"));

  it("master lista sem filtro de tenant e lê organizations", async () => {
    renderPage();
    await screen.findByText("Bruno Vendedor");
    const profileCalls = mockSupabase.callsFor("profiles");
    expect(profileCalls.some((c) => c[0] === "eq")).toBe(false);
    expect(mockSupabase.callsFor("organizations").length).toBeGreaterThan(0);
  });

  it("usuário pendente mostra aprovar e a aprovação chama a rpc", async () => {
    renderPage();
    await screen.findByText("Carla Pendente");
    const approve = screen.getAllByRole("button", { name: /aprovar/i });
    expect(approve).toHaveLength(1);
    fireEvent.click(approve[0]);
    await waitFor(() =>
      expect(mockSupabase.rpcCalls()).toContainEqual({ fn: "admin_approve_user", args: { target_user_id: "u-pend" } })
    );
  });

  it("modal de criar usuário mostra os campos", async () => {
    renderPage();
    await screen.findByText("Bruno Vendedor");
    fireEvent.click(screen.getByRole("button", { name: /novo usuário/i }));
    expect(await screen.findByText("Criar Novo Usuário")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("João Silva")).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText("usuario@empresa.com").length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText("Senha segura")).toBeInTheDocument();
    expect(screen.getByText("Função/Permissão")).toBeInTheDocument();
    expect(screen.getByText("Empresa (Opcional)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /criar usuário/i })).toBeInTheDocument();
  });

  it("master vê a aba de empresas", async () => {
    renderPage();
    await screen.findByText("Bruno Vendedor");
    expect(screen.getByRole("tab", { name: /empresas/i })).toBeInTheDocument();
  });
});
