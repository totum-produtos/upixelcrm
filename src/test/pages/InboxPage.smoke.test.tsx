// Smoke test da InboxPage: rede de segurança para a refatoração em componentes.
// Renderiza a página com hooks/contextos mockados e confere a UI principal.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { retryMessage } = vi.hoisted(() => ({ retryMessage: vi.fn() }));

vi.mock("@/integrations/supabase/client", async () => {
  const { createSupabaseMock } = await import("@/test/helpers/supabaseInboxStub");
  return { supabase: createSupabaseMock() };
});

// O AppLayout real provê o TooltipProvider; o mock mantém isso e dispensa sidebar/header.
vi.mock("@/components/layout/AppLayout", async () => {
  const { TooltipProvider } = await import("@/components/ui/tooltip");
  return {
    AppLayout: ({ children }: { children: ReactNode }) => (
      <TooltipProvider>
        <div data-testid="app-layout">{children}</div>
      </TooltipProvider>
    ),
  };
});

vi.mock("@/hooks/useCsatSender", () => ({ useCsatSender: () => undefined }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", name: "Agente Teste", client_id: "c1" } }),
}));

vi.mock("@/contexts/TenantContext", () => ({
  useTenant: () => ({ tenant: { id: "t1" } }),
}));

vi.mock("@/contexts/AppContext", () => ({
  useAppState: () => ({
    tasks: [],
    toggleTaskStatus: vi.fn(),
    moveLead: vi.fn(),
    columns: [{ id: "col1", name: "Qualificado", color: "#00ff00" }],
    leads: [
      { id: "lead-1", name: "Maria Silva", phone: "5511999990001", email: "maria@x.com", company: "Acme", column_id: "col1", tags: ["vip"], value: 1000 },
    ],
    refreshData: vi.fn(),
    updateLead: vi.fn(),
    addTimelineEvent: vi.fn(),
  }),
}));

vi.mock("@/hooks/useInbox", async () => {
  const { useState } = await import("react");
  const conversations = [
    {
      lead_id: "lead-1", lead_name: "Maria Silva", lead_phone: "5511999990001", lead_email: "maria@x.com",
      lead_company: "Acme", category: "lead", last_message: "Olá, preciso de ajuda", last_message_at: new Date().toISOString(),
      unread_count: 2, status: "open", priority: "none", assignee_id: null, labels: [], channels: ["whatsapp"],
      source_conversations: [{ id: "conv-1", channel: "whatsapp", metadata: {} }],
    },
    {
      lead_id: "lead-2", lead_name: "Joao Souza", lead_phone: "5511999990002", lead_email: null,
      lead_company: null, category: "lead", last_message: "Obrigado pelo retorno", last_message_at: new Date().toISOString(),
      unread_count: 0, status: "open", priority: "none", assignee_id: null, labels: [], channels: ["email"],
      source_conversations: [{ id: "conv-2", channel: "email", metadata: {} }],
    },
    {
      lead_id: "lead-3", lead_name: "Ana Resolvida", lead_phone: null, lead_email: null,
      lead_company: null, category: "lead", last_message: "Tudo certo", last_message_at: new Date().toISOString(),
      unread_count: 0, status: "resolved", priority: "none", assignee_id: null, labels: [], channels: ["whatsapp"],
      source_conversations: [{ id: "conv-3", channel: "whatsapp", metadata: {} }],
    },
  ];
  const messagesByLead: Record<string, unknown[]> = {
    "lead-1": [
      { id: "m1", conversation_id: "conv-1", content: "Mensagem de entrada da Maria", type: "text", direction: "inbound", sender_name: "Maria", metadata: {}, created_at: "2026-01-10T10:00:00Z", channel: "whatsapp", is_private: false, content_type: "text" },
      { id: "m2", conversation_id: "conv-1", content: "Resposta do agente", type: "text", direction: "outbound", sender_name: "Agente", metadata: { delivery_status: "read" }, created_at: "2026-01-10T10:05:00Z", channel: "whatsapp", is_private: false, content_type: "text" },
    ],
    "lead-2": [
      { id: "m3", conversation_id: "conv-2", content: "Email do Joao", type: "text", direction: "inbound", sender_name: "Joao", metadata: {}, created_at: "2026-01-11T10:00:00Z", channel: "email", is_private: false, content_type: "text" },
      { id: "m4", conversation_id: "conv-2", content: "https://exemplo.test/foto.png", type: "image", direction: "inbound", sender_name: "Joao", metadata: { caption: "Legenda da foto" }, created_at: "2026-01-11T10:01:00Z", channel: "whatsapp", is_private: false, content_type: "image" },
      { id: "m5", conversation_id: "conv-2", content: "https://exemplo.test/doc.pdf", type: "document", direction: "inbound", sender_name: "Joao", metadata: { filename: "contrato.pdf" }, created_at: "2026-01-11T10:02:00Z", channel: "whatsapp", is_private: false, content_type: "document" },
      { id: "m6", conversation_id: "conv-2", content: "[local]", type: "location", direction: "inbound", sender_name: "Joao", metadata: { name: "Escritorio Central" }, created_at: "2026-01-11T10:03:00Z", channel: "whatsapp", is_private: false, content_type: "location" },
      { id: "m7", conversation_id: "conv-2", content: "Nota interna do time", type: "text", direction: "outbound", sender_name: "Agente", metadata: { is_private: true }, created_at: "2026-01-11T10:04:00Z", channel: "whatsapp", is_private: true, content_type: "text" },
      { id: "m8", conversation_id: "conv-2", content: "Mensagem que falhou", type: "text", direction: "outbound", sender_name: "Agente", metadata: { failed: true }, created_at: "2026-01-11T11:30:00Z", channel: "whatsapp", is_private: false, content_type: "text" },
    ],
  };
  return {
    useInbox: () => {
      const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
      return {
        conversations,
        messages: selectedLeadId ? messagesByLead[selectedLeadId] ?? [] : [],
        selectedLeadId,
        loading: false,
        selectLead: (id: string) => setSelectedLeadId(id),
        sendMessage: vi.fn(), retryMessage, createConversation: vi.fn(),
        updateStatus: vi.fn(), updatePriority: vi.fn(), assignToAgent: vi.fn(), updateLabels: vi.fn(),
        snoozeConversation: vi.fn(), transcribeAudio: vi.fn(), sendWhatsAppMedia: vi.fn(),
        deleteLead: vi.fn(), mergeLeads: vi.fn(), refresh: vi.fn(),
      };
    },
  };
});

import InboxPage from "@/pages/InboxPage";

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/inbox"]}>
        <InboxPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("InboxPage (smoke)", () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    // jsdom não implementa scrollIntoView (usado no auto-scroll das mensagens).
    scrollIntoView.mockClear();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
  });

  it("renderiza as abas de status e a busca", () => {
    renderPage();
    expect(screen.getByText("Abertas")).toBeInTheDocument();
    expect(screen.getByText("Resolvidas")).toBeInTheDocument();
    expect(screen.getByText("Adiadas")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Buscar conversas...")).toBeInTheDocument();
    expect(screen.getByLabelText("Somente não lidas")).toBeInTheDocument();
    expect(screen.getByLabelText("Todos")).toBeInTheDocument();
  });

  it("lista apenas conversas abertas na aba padrao e troca para resolvidas", () => {
    renderPage();
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    expect(screen.getByText("Joao Souza")).toBeInTheDocument();
    expect(screen.queryByText("Ana Resolvida")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Resolvidas"));
    expect(screen.getByText("Ana Resolvida")).toBeInTheDocument();
    expect(screen.queryByText("Maria Silva")).not.toBeInTheDocument();
  });

  it("filtra por texto de busca", () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText("Buscar conversas..."), { target: { value: "joao" } });
    expect(screen.queryByText("Maria Silva")).not.toBeInTheDocument();
    expect(screen.getByText("Joao Souza")).toBeInTheDocument();
  });

  it("mostra estado vazio antes de selecionar uma conversa", () => {
    renderPage();
    expect(screen.getByText("Sua Inbox")).toBeInTheDocument();
    expect(screen.queryByText("Resolver conversa")).not.toBeInTheDocument();
  });

  it("ao selecionar uma conversa mostra mensagens, compositor e painel do lead", () => {
    renderPage();
    fireEvent.click(screen.getByText("Maria Silva"));
    expect(screen.getByText("Mensagem de entrada da Maria")).toBeInTheDocument();
    expect(screen.getByText("Resposta do agente")).toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalled();
    expect(screen.getByLabelText("Resolver conversa")).toBeInTheDocument();
    expect(screen.getAllByRole("textbox").length).toBeGreaterThan(1);
    expect(screen.getByText("Estágio no Funil")).toBeInTheDocument();
    expect(screen.getByText("Estatísticas do Lead")).toBeInTheDocument();
    expect(screen.getByText("VER NO CRM")).toBeInTheDocument();
    expect(screen.queryByText("Sua Inbox")).not.toBeInTheDocument();
  });

  it("troca as mensagens ao selecionar outra conversa", () => {
    renderPage();
    fireEvent.click(screen.getByText("Maria Silva"));
    fireEvent.click(screen.getByText("Joao Souza"));
    expect(screen.getByText("Email do Joao")).toBeInTheDocument();
    expect(screen.queryByText("Mensagem de entrada da Maria")).not.toBeInTheDocument();
  });

  it("abre o dialogo de nova conversa", () => {
    renderPage();
    const buttons = within(screen.getByTestId("app-layout")).getAllByRole("button");
    // botao "+" ao lado das abas (icone sem texto)
    const plus = buttons.find((b) => b.querySelector("svg.lucide-plus") && !b.textContent);
    expect(plus).toBeDefined();
    fireEvent.click(plus!);
    expect(screen.getByText("Nova Conversa")).toBeInTheDocument();
    expect(screen.getByText("Iniciar Conversa")).toBeInTheDocument();
  });

  it("renderiza tipos de mensagem, nota privada, mudanca de canal e retry de falha", () => {
    renderPage();
    fireEvent.click(screen.getByText("Joao Souza"));
    expect(screen.getAllByText("Nota Privada").length).toBeGreaterThan(0);
    expect(screen.getByText("Nota interna do time")).toBeInTheDocument();
    expect(screen.getByText("contrato.pdf")).toBeInTheDocument();
    expect(screen.getByText("Escritorio Central")).toBeInTheDocument();
    expect(screen.getByAltText("Imagem")).toBeInTheDocument();
    expect(screen.getAllByText(/Canal alterado para/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText(/tentar de novo/));
    expect(retryMessage).toHaveBeenCalledWith("m8");
  });

  it("abre o visualizador de midia ao clicar na imagem e fecha", () => {
    renderPage();
    fireEvent.click(screen.getByText("Joao Souza"));
    fireEvent.click(screen.getByAltText("Imagem"));
    expect(screen.getByText("1 de 2 arquivos")).toBeInTheDocument();
    expect(screen.getByText("BAIXAR")).toBeInTheDocument();
    const headerButtons = screen.getByText("BAIXAR").parentElement!.querySelectorAll("button");
    fireEvent.click(headerButtons[headerButtons.length - 1]);
    expect(screen.queryByText("1 de 2 arquivos")).not.toBeInTheDocument();
  });

  it("recolhe e reabre o painel do lead", () => {
    renderPage();
    fireEvent.click(screen.getByText("Maria Silva"));
    fireEvent.click(screen.getByLabelText("Recolher painel do lead"));
    expect(screen.getByLabelText("Mostrar painel do lead")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Mostrar painel do lead"));
    expect(screen.queryByLabelText("Mostrar painel do lead")).not.toBeInTheDocument();
  });

  it("abre a confirmacao de exclusao a partir do painel do lead", () => {
    renderPage();
    fireEvent.click(screen.getByText("Maria Silva"));
    fireEvent.click(screen.getByText("Deletar"));
    expect(screen.getByText("Confirmar Exclusão")).toBeInTheDocument();
    expect(screen.getByText("Sim, Excluir Perfil")).toBeInTheDocument();
  });
});
