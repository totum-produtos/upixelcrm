import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Search, Phone, PhoneMissed, MessageSquare, Plus, MessageCircle, Loader2, CheckCheck, X, List,
  MessageSquareDot,
} from "lucide-react";
import { MergeLeadsModal } from "@/components/crm/MergeLeadsModal";
import { Checkbox } from "@/components/ui/checkbox";
import { InboxBulkActionsBar } from "@/components/inbox/InboxBulkActionsBar";
import { InboxMediaViewer } from "@/components/inbox/InboxMediaViewer";
import { InboxMessageList } from "@/components/inbox/InboxMessageList";
import { InboxChatHeader } from "@/components/inbox/InboxChatHeader";
import { InboxLeadPanel } from "@/components/inbox/InboxLeadPanel";
import { InboxDeleteLeadDialog } from "@/components/inbox/InboxDeleteLeadDialog";
import { InboxNewConversationDialog } from "@/components/inbox/InboxNewConversationDialog";
import { SelectionProvider, useSelection } from "@/contexts/SelectionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { CreateTaskModal } from "@/components/crm/CreateTaskModal";
import { AddTagModal } from "@/components/crm/AddTagModal";
import { ReplyBox } from "@/components/inbox/ReplyBox";
import { PriorityBadge } from "@/components/inbox/PriorityBadge";
import { ConversationStatusBadge } from "@/components/inbox/ConversationStatusBadge";
import { CHANNEL_COLORS, CHANNEL_LABELS, CHANNEL_ICONS, formatTime, initials } from "@/lib/inbox-ui";
import { useAppState } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useInbox } from "@/hooks/useInbox";
import { useCsatSender } from "@/hooks/useCsatSender";
import { useMediaViewer } from "@/hooks/useMediaViewer";
import { useNewConversationForm } from "@/hooks/useNewConversationForm";
import { useIsMobile } from "@/hooks/use-mobile";
import { useElementSize } from "@/hooks/use-element-size";
import type { ShadowSdrConversationInput } from "@/types/shadow-sdr";

// Wrapper externo só pra providar o SelectionContext, mesmo padrão do CRMPage
// (src/pages/CRMPage.tsx) — escopo do provider restrito ao Inbox.
export default function InboxPage() {
  return (
    <SelectionProvider>
      <InboxPageInner />
    </SelectionProvider>
  );
}

function InboxPageInner() { // force HMR reset
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tasks, toggleTaskStatus, moveLead, columns, leads, refreshData, updateLead, addTimelineEvent } = useAppState();
  const { user } = useAuth();
  const inbox = useInbox(refreshData);
  useCsatSender();
  const { selectionMode, isSelected, toggleLead, enterSelectionMode, exitSelectionMode, selectAll } = useSelection();

  const openQuickLog = async (leadId: string, type: "call" | "call_attempt") => {
    const label = type === "call" ? "Ligação registrada" : "Tentativa de ligação registrada";
    await addTimelineEvent({ lead_id: leadId, type, content: label, user_name: user?.name || "Você", user_id: user?.id });
  };

  // Esc cancela a seleção em massa.
  useEffect(() => {
    if (!selectionMode) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") exitSelectionMode(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectionMode, exitSelectionMode]);

  
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [inboxTab, setInboxTab] = useState<string>("abertas");
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem("upixel.inbox.showSidebar");
    return saved === null ? true : saved === "1";
  });

  // Persiste preferência do painel lateral para não voltar todo reload.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("upixel.inbox.showSidebar", showSidebar ? "1" : "0");
  }, [showSidebar]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // ── Responsividade ──
  const isMobile = useIsMobile();
  // No mobile o layout mostra uma coluna por vez: 'list' → 'chat'.
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  // Painel do lead no mobile abre como overlay sob demanda (não persiste como o desktop).
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  // Mede a largura real do header do chat para colapsar as ações ANTES de sobrepor
  // (o painel aberto num laptop espreme o chat, o que o viewport sozinho não detecta).
  const { ref: chatHeaderRef, width: chatHeaderWidth } = useElementSize<HTMLDivElement>();
  const compactActions = isMobile || (chatHeaderWidth > 0 && chatHeaderWidth < 560);

  // Estado unificado de abertura do painel do lead (desktop persiste; mobile é overlay).
  const panelOpen = isMobile ? mobilePanelOpen : showSidebar;
  const setPanelOpen = (open: boolean) => {
    if (isMobile) setMobilePanelOpen(open);
    else setShowSidebar(open);
  };
  const togglePanel = () => setPanelOpen(!panelOpen);

  // New conversation modal
  const {
    newConvOpen, setNewConvOpen, newChannel, setNewChannel, newLeadId, setNewLeadId,
    newPhone, setNewPhone, newEmail, setNewEmail, handleCreateConversation,
  } = useNewConversationForm(inbox.createConversation, leads);

  // Modal states
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const { mediaViewer, setMediaViewer, allMedia, currentMediaIndex, navigateMedia } = useMediaViewer(inbox.messages);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedLeadGroup = useMemo(
    () => inbox.conversations.find(c => c.lead_id === inbox.selectedLeadId),
    [inbox.conversations, inbox.selectedLeadId]
  );

  // Reseta a conversa ativa SÓ quando muda o lead selecionado (não a cada mensagem nova).
  // Incluir selectedLeadGroup nas deps faria o effect rodar a cada update de conversations,
  // pulando a conversa ativa de volta para a primeira sempre que chega uma mensagem.
  useEffect(() => {
    if (selectedLeadGroup && selectedLeadGroup.source_conversations.length > 0) {
      setActiveConversationId(selectedLeadGroup.source_conversations[0].id);
    } else {
      setActiveConversationId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeadGroup?.lead_id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [inbox.messages]);

  // Deep-link: ?lead_id=X[&phone=Y] vindo de LeadProfilePage > "Enviar mensagem".
  // 1. Seleciona o lead se já tem conversa.
  // 2. Se não tem conversa, abre o modal "Nova conversa" pré-preenchido com phone.
  // Limpa os params depois pra navegação interna não re-disparar o efeito.
  const deepLinkProcessedRef = useRef(false);
  useEffect(() => {
    if (deepLinkProcessedRef.current) return;
    const leadIdParam = searchParams.get("lead_id");
    if (!leadIdParam) return;
    // Aguarda conversations carregar antes de decidir (se não, vai sempre cair no else)
    if (inbox.loading) return;

    deepLinkProcessedRef.current = true;
    const phoneParam = searchParams.get("phone") ?? "";
    const hasConversation = inbox.conversations.some((c) => c.lead_id === leadIdParam);

    if (hasConversation) {
      inbox.selectLead(leadIdParam);
    } else {
      // Sem conversa pra esse lead — abre modal "Nova conversa" preenchido
      setNewLeadId(leadIdParam);
      setNewPhone(phoneParam);
      setNewChannel("whatsapp");
      setNewConvOpen(true);
    }

    // Limpa params da URL pra não disparar de novo em re-render
    const next = new URLSearchParams(searchParams);
    next.delete("lead_id");
    next.delete("phone");
    setSearchParams(next, { replace: true });
  }, [searchParams, inbox.loading, inbox.conversations, inbox.selectLead, setSearchParams]);

  const filteredConversations = useMemo(() => {
    let result = inbox.conversations;
    
    // Status-based Tab Filtering (Chatwoot style)
    if (inboxTab === "abertas") {
      result = result.filter(t => t.status === "open");
    } else if (inboxTab === "resolvidas") {
      result = result.filter(t => t.status === "resolved");
    } else if (inboxTab === "adiadas") {
      result = result.filter(t => t.status === "snoozed");
    }

    if (channelFilter !== "all") {
      result = result.filter(t => t.channels.includes(channelFilter));
    }
    if (unreadOnly) {
      result = result.filter(t => t.unread_count > 0);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        (t.lead_name || "").toLowerCase().includes(q) ||
        (t.last_message || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [inbox.conversations, searchQuery, channelFilter, unreadOnly, inboxTab]);

  // Find lead data for selected conversation
  const selectedLead = useMemo(() => {
    if (!selectedLeadGroup?.lead_id) return null;
    return leads.find(l => l.id === selectedLeadGroup.lead_id) || null;
  }, [selectedLeadGroup, leads]);

  const leadColumn = useMemo(
    () => columns.find(c => c.id === selectedLead?.column_id),
    [selectedLead?.column_id, columns]
  );

  const leadTasks = useMemo(
    () => selectedLead ? tasks.filter(t => t.lead_id === selectedLead.id) : [],
    [tasks, selectedLead]
  );

  const shadowSdrInput = useMemo<ShadowSdrConversationInput | null>(() => {
    if (!selectedLeadGroup) return null;

    return {
      lead: {
        id: selectedLead?.id || selectedLeadGroup.lead_id,
        name: selectedLead?.name || selectedLeadGroup.lead_name,
        phone: selectedLead?.phone || selectedLeadGroup.lead_phone,
        email: selectedLead?.email || selectedLeadGroup.lead_email,
        company: selectedLead?.company || selectedLeadGroup.lead_company,
        category: selectedLeadGroup.category,
        stageName: leadColumn?.name,
        value: selectedLead?.value,
        tags: selectedLead?.tags || [],
      },
      channels: selectedLeadGroup.channels,
      lastMessageAt: selectedLeadGroup.last_message_at,
      messages: inbox.messages.map((message) => ({
        id: message.id,
        content: message.content,
        direction: message.direction,
        type: message.type,
        createdAt: message.created_at,
        senderName: message.sender_name,
        isPrivate: message.is_private,
      })),
    };
  }, [selectedLeadGroup, selectedLead, leadColumn?.name, inbox.messages]);

  return (
    <AppLayout title="Inbox" subtitle="Central de atendimento">
      <div className="flex h-[calc(100dvh-4rem)] animate-fade-in">
        {/* ─── Thread list ─── */}
        <div className={`${isMobile ? (mobileView === "chat" ? "hidden" : "w-full") : "w-80 shrink-0"} ghost-border border-r flex flex-col`}>
          <div className="p-3 ghost-border border-b space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg">
                {[
                  { key: "abertas", label: "Abertas" },
                  { key: "resolvidas", label: "Resolvidas" },
                  { key: "adiadas", label: "Adiadas" },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setInboxTab(tab.key)}
                    className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${
                      inboxTab === tab.key
                        ? "bg-background text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setNewConvOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
                placeholder="Buscar conversas..."
              />
            </div>
            <div className="flex gap-1.5">
              {["all", "whatsapp", "whatsapp_official", "email", "instagram"].map(ch => {
                const Icon = ch === "all" ? List : CHANNEL_ICONS[ch] || MessageCircle;
                const label = ch === "all" ? "Todos" : CHANNEL_LABELS[ch];
                return (
                  <Tooltip key={ch}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setChannelFilter(ch)}
                        aria-label={label}
                        className={`h-7 w-7 flex items-center justify-center rounded-full transition-colors ${
                          channelFilter === ch
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{label}</TooltipContent>
                  </Tooltip>
                );
              })}
              <div className="w-px h-5 bg-border self-center mx-0.5" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setUnreadOnly(v => !v)}
                    aria-label="Somente não lidas"
                    aria-pressed={unreadOnly}
                    className={`h-7 w-7 flex items-center justify-center rounded-full transition-colors ${
                      unreadOnly
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <MessageSquareDot className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Somente não lidas</TooltipContent>
              </Tooltip>
            </div>
          </div>
          {selectionMode && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/40 border-b border-[hsl(var(--border-strong))] text-[11px]">
              <button
                className="text-primary font-semibold hover:underline"
                onClick={() => selectAll(filteredConversations.map((c) => c.lead_id))}
              >
                Selecionar {filteredConversations.length} visíveis
              </button>
              <button className="text-muted-foreground hover:text-foreground" onClick={exitSelectionMode}>
                Cancelar
              </button>
            </div>
          )}
          <div className="flex-1 overflow-auto">
            {inbox.loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <MessageCircle className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground text-center">Nenhuma conversa encontrada</p>
                <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => setNewConvOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Nova conversa
                </Button>
              </div>
            ) : (
              filteredConversations.map(c => (
                <div
                  key={c.lead_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (selectionMode) { toggleLead(c.lead_id); return; }
                    inbox.selectLead(c.lead_id);
                    setActiveConversationId(c.source_conversations[0]?.id || null);
                    setMobileView("chat");
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    if (selectionMode) { toggleLead(c.lead_id); return; }
                    inbox.selectLead(c.lead_id);
                    setActiveConversationId(c.source_conversations[0]?.id || null);
                    setMobileView("chat");
                  }}
                  className={`group w-full flex items-start gap-3 p-3 text-left hover:bg-secondary transition-all duration-200 border-b border-[hsl(var(--border-strong))] relative cursor-pointer ${
                    inbox.selectedLeadId === c.lead_id ? "bg-primary/5 shadow-[inset_3px_0_0_0_#9b87f5]" : ""
                  }`}
                >
                  <div
                    className={`shrink-0 self-center transition-opacity ${selectionMode || isSelected(c.lead_id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!selectionMode) enterSelectionMode();
                      toggleLead(c.lead_id);
                    }}
                  >
                    <Checkbox checked={isSelected(c.lead_id)} aria-label={`Selecionar conversa com ${c.lead_name}`} />
                  </div>
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xs font-semibold text-primary shadow-sm relative overflow-visible">
                      {initials(c.lead_name || "?")}
                      {/* Status indicator */}
                      <div className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background shadow-sm ${c.unread_count > 0 ? "bg-success" : "bg-muted-foreground/40"}`} />
                    </div>
                    <div className="absolute -bottom-1 -left-1 flex -space-x-1">
                      {c.channels.slice(0, 2).map((ch, idx) => {
                        const Icon = CHANNEL_ICONS[ch] || MessageCircle;
                        return (
                          <div key={idx} className={`h-4 w-4 rounded-full border-2 border-background flex items-center justify-center ${CHANNEL_COLORS[ch] || "bg-muted shadow-sm"}`}>
                            <Icon className="h-2 w-2 text-white" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[13px] font-bold truncate ${c.unread_count > 0 ? "text-foreground" : "text-foreground/80"}`}>{c.lead_name}</span>
                        {c.category !== "lead" && (
                          <Badge className={`text-[9px] px-1.5 py-0 h-3.5 border-none uppercase font-black ${c.category === "partner" ? "bg-blue-500/20 text-blue-600" : "bg-purple-500/20 text-purple-600"}`}>
                            {c.category === "partner" ? "Parceiro" : "Colab."}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-medium">{formatTime(c.last_message_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {c.last_message && c.unread_count === 0 && (
                        <CheckCheck className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                      )}
                      <p className={`text-[11px] truncate leading-tight ${c.unread_count > 0 ? "text-foreground font-bold" : "text-muted-foreground"}`}>
                        {c.last_message || "Sem mensagens"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <ConversationStatusBadge status={c.status} />
                      <PriorityBadge priority={c.priority} />
                      {c.channels.map(ch => {
                         const Icon = CHANNEL_ICONS[ch] || MessageCircle;
                         return <Icon key={ch} className="h-2.5 w-2.5 text-muted-foreground/60" />;
                      })}
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity self-center shrink-0">
                    <button
                      title="Registrar tentativa de ligação"
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-secondary"
                      onClick={(e) => { e.stopPropagation(); openQuickLog(c.lead_id, "call_attempt"); }}
                    >
                      <PhoneMissed className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      title="Registrar ligação"
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-secondary"
                      onClick={(e) => { e.stopPropagation(); openQuickLog(c.lead_id, "call"); }}
                    >
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  {c.unread_count > 0 && (
                    <div className="flex flex-col items-end gap-2 self-center">
                      <div className="h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1.5 shadow-md animate-in zoom-in duration-300">
                        {c.unread_count}
                      </div>
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── Chat area ─── */}
        <div className={`${isMobile ? (mobileView === "chat" ? "w-full" : "hidden") : "flex-1"} flex flex-col min-w-0 bg-background relative`}>
          {selectedLeadGroup ? (
            <>
              {/* Chat header */}
              <InboxChatHeader
                chatHeaderRef={chatHeaderRef}
                isMobile={isMobile}
                compactActions={compactActions}
                onBackToList={() => setMobileView("list")}
                onTogglePanel={togglePanel}
                panelOpen={panelOpen}
                onPanelOpenChange={setPanelOpen}
                selectedLeadGroup={selectedLeadGroup}
                selectedLeadId={inbox.selectedLeadId}
                leadColumn={leadColumn}
                activeConversationId={activeConversationId}
                updateStatus={inbox.updateStatus}
                updatePriority={inbox.updatePriority}
                snoozeConversation={inbox.snoozeConversation}
                sendMessage={inbox.sendMessage}
                updateLabels={inbox.updateLabels}
                assignToAgent={inbox.assignToAgent}
                onRefresh={inbox.refresh}
                onDeleteLead={() => setDeleteConfirmOpen(true)}
                onMergeLeads={() => setMergeModalOpen(true)}
              />

              {/* Messages timeline */}
              <InboxMessageList
                messages={inbox.messages}
                leadName={selectedLeadGroup.lead_name}
                messagesEndRef={messagesEndRef}
                onOpenMedia={setMediaViewer}
                retryMessage={inbox.retryMessage}
                transcribeAudio={inbox.transcribeAudio}
              />

              {selectedLeadGroup && (
                <ReplyBox
                  onSend={async (text, isPrivate, targetId) => {
                    setSending(true);
                    try {
                      await inbox.sendMessage(text, targetId, isPrivate);
                    } finally {
                      setSending(false);
                    }
                  }}
                  onSendMedia={async (file, targetId) => {
                    setSending(true);
                    try {
                      if (!inbox.selectedLeadId) {
                        toast.error("Selecione um contato primeiro.");
                        return;
                      }
                      await inbox.sendWhatsAppMedia(inbox.selectedLeadId, file, targetId);
                    } finally {
                      setSending(false);
                    }
                  }}
                  sending={sending}
                  sourceConversations={selectedLeadGroup.source_conversations || []}
                  activeConversationId={activeConversationId || undefined}
                  setActiveConversationId={id => setActiveConversationId(id)}
                  leadName={selectedLeadGroup.lead_name}
                  leadPhone={selectedLeadGroup.lead_phone}
                  leadEmail={selectedLeadGroup.lead_email}
                  leadCompany={selectedLeadGroup.lead_company}
                  agentName={user?.name}
                  onAddChannel={async (channel) => {
                    const phone = selectedLeadGroup.lead_phone || "";
                    const email = selectedLeadGroup.lead_email || "";
                    const name = selectedLeadGroup.lead_name || "";
                    const newId = await inbox.createConversation(
                      channel,
                      selectedLeadGroup.lead_id,
                      phone,
                      email,
                      name
                    );
                    if (newId) {
                      setActiveConversationId(newId);
                      toast.success(`Canal ${CHANNEL_LABELS[channel] || channel} adicionado!`);
                    }
                  }}
                />
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent">
              <div className="h-20 w-20 rounded-card bg-secondary flex items-center justify-center mb-6 animate-pulse">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Sua Inbox</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs text-center">Selecione um lead ao lado para visualizar o histórico de mensagens e responder.</p>
              <Button size="sm" variant="outline" className="mt-6 text-xs shadow-sm rounded-xl px-4" onClick={() => setNewConvOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5 text-primary" /> Nova conversa
              </Button>
            </div>
          )}
        </div>

        {/* ─── Lead context panel (coluna retrátil no desktop, overlay no mobile) ─── */}
        <InboxLeadPanel
          isMobile={isMobile}
          mobileView={mobileView}
          panelOpen={panelOpen}
          onPanelOpenChange={setPanelOpen}
          selectedLeadGroup={selectedLeadGroup}
          selectedLead={selectedLead}
          leadColumn={leadColumn}
          leadTasks={leadTasks}
          columns={columns}
          messages={inbox.messages}
          shadowSdrInput={shadowSdrInput}
          updateLead={updateLead}
          moveLead={moveLead}
          toggleTaskStatus={toggleTaskStatus}
          onRefresh={inbox.refresh}
          updateLabels={inbox.updateLabels}
          onOpenTaskModal={() => setTaskModalOpen(true)}
          onOpenTagModal={() => setTagModalOpen(true)}
          onOpenMergeModal={() => setMergeModalOpen(true)}
          onOpenDeleteConfirm={() => setDeleteConfirmOpen(true)}
        />
      </div>

      {/* New Conversation Modal */}
      <InboxNewConversationDialog
        open={newConvOpen}
        onOpenChange={setNewConvOpen}
        leads={leads}
        channel={newChannel}
        onChannelChange={setNewChannel}
        leadId={newLeadId}
        onLeadIdChange={setNewLeadId}
        phone={newPhone}
        onPhoneChange={setNewPhone}
        email={newEmail}
        onEmailChange={setNewEmail}
        onSubmit={handleCreateConversation}
      />

      {/* Modals */}
      {selectedLead && (
        <>
          <CreateTaskModal open={taskModalOpen} onOpenChange={setTaskModalOpen} defaultLeadId={selectedLead.id} />
          <AddTagModal open={tagModalOpen} onOpenChange={setTagModalOpen} leadId={selectedLead.id} />
          
          <MergeLeadsModal 
            open={mergeModalOpen} 
            onOpenChange={setMergeModalOpen} 
            sourceLead={selectedLead} 
            onMerge={inbox.mergeLeads} 
          />

          <InboxDeleteLeadDialog
            open={deleteConfirmOpen}
            onOpenChange={setDeleteConfirmOpen}
            leadName={selectedLead.name}
            onConfirm={() => inbox.deleteLead(selectedLead.id)}
          />
        </>
      )}
      {/* Media Viewer Lightbox */}
      {mediaViewer && (
        <InboxMediaViewer
          mediaViewer={mediaViewer}
          currentMediaIndex={currentMediaIndex}
          totalMedia={allMedia.length}
          onClose={() => setMediaViewer(null)}
          onNavigate={navigateMedia}
        />
      )}

      <InboxBulkActionsBar
        conversations={inbox.conversations}
        updateStatus={inbox.updateStatus}
        snoozeConversation={inbox.snoozeConversation}
        assignToAgent={inbox.assignToAgent}
        updateLabels={inbox.updateLabels}
        refresh={inbox.refresh}
      />
    </AppLayout>
  );
}
