import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Search, Phone, PhoneMissed, MoreVertical, MessageSquare, CheckSquare, Plus, MessageCircle,
  Loader2, ExternalLink, Lock, Check, CheckCheck, Clock, File, Download, Maximize2, Activity, X,
  MapPin, UserSquare2, PlayCircle, AlertCircle, PanelRightOpen, ArrowLeft, List, MessageSquareDot,
  RefreshCw,
} from "lucide-react";
import { MergeLeadsModal } from "@/components/crm/MergeLeadsModal";
import { Checkbox } from "@/components/ui/checkbox";
import { InboxBulkActionsBar } from "@/components/inbox/InboxBulkActionsBar";
import { InboxMediaViewer } from "@/components/inbox/InboxMediaViewer";
import { InboxLeadPanel } from "@/components/inbox/InboxLeadPanel";
import { InboxDeleteLeadDialog } from "@/components/inbox/InboxDeleteLeadDialog";
import { InboxNewConversationDialog } from "@/components/inbox/InboxNewConversationDialog";
import { SelectionProvider, useSelection } from "@/contexts/SelectionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { CreateTaskModal } from "@/components/crm/CreateTaskModal";
import { AddTagModal } from "@/components/crm/AddTagModal";
import { ConversationActions } from "@/components/inbox/ConversationActions";
import { ReplyBox } from "@/components/inbox/ReplyBox";
import { SnoozePopover } from "@/components/inbox/SnoozePopover";
import { MacrosDropdown } from "@/components/inbox/MacrosDropdown";
import { PriorityBadge } from "@/components/inbox/PriorityBadge";
import { ConversationStatusBadge } from "@/components/inbox/ConversationStatusBadge";
import { formatFileSize } from "@/lib/utils";
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
  const [isTranscribing, setIsTranscribing] = useState<string | null>(null);
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
              <div ref={chatHeaderRef} className="px-4 py-2.5 ghost-border border-b flex items-center justify-between shrink-0 bg-card z-10">
                <div className="flex items-center gap-3 min-w-0">
                  {isMobile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Voltar para a lista"
                      className="h-8 w-8 shrink-0 -ml-1"
                      onClick={() => setMobileView("list")}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <div className="relative group cursor-pointer shrink-0" onClick={togglePanel}>
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xs font-semibold text-primary shadow-sm group-hover:shadow-md transition-all">
                      {initials(selectedLeadGroup.lead_name || "?")}
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background flex items-center justify-center overflow-hidden">
                      {(() => {
                        const Icon = CHANNEL_ICONS[selectedLeadGroup.channels[0]] || MessageCircle;
                        return <Icon className={`h-full w-full p-0.5 text-white ${CHANNEL_COLORS[selectedLeadGroup.channels[0]]}`} />;
                      })()}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{selectedLeadGroup.lead_name}</p>
                      {selectedLeadGroup.category !== "lead" && (
                        <Badge className={`text-[9px] px-2 py-0 h-4 border-none uppercase font-black ${selectedLeadGroup.category === "partner" ? "bg-blue-500/20 text-blue-600" : "bg-purple-500/20 text-purple-600"}`}>
                          {selectedLeadGroup.category === "partner" ? "Parceiro" : "Colaborador"}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/10 border border-success/20 shrink-0">
                        <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                        <span className="text-[9px] font-bold text-success uppercase">Online</span>
                      </div>
                      <ConversationStatusBadge status={selectedLeadGroup.status} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] text-muted-foreground">
                        {selectedLeadGroup.channels.map(ch => CHANNEL_LABELS[ch]).join(" & ")}
                      </p>
                      {leadColumn && (
                        <>
                          <span className="text-muted-foreground/40 text-[10px]">·</span>
                          <p className="text-[10px] font-medium text-primary">{leadColumn.name}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <TooltipProvider delayDuration={200}>
                    {compactActions ? (
                      /* Erro 2: colapsa as ações num hamburguer ANTES de sobrepor */
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Ações da conversa" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-56 p-2 space-y-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs h-9 gap-2 font-semibold hover:bg-green-500/10 hover:text-green-600"
                            onClick={() => inbox.updateStatus(inbox.selectedLeadId!, "resolved")}
                          >
                            <CheckSquare className="h-3.5 w-3.5" /> Resolver conversa
                          </Button>
                          <SnoozePopover
                            onSnooze={(until) => inbox.snoozeConversation(inbox.selectedLeadId!, until)}
                          />
                          <MacrosDropdown
                            leadId={inbox.selectedLeadId!}
                            conversationId={activeConversationId || undefined}
                            currentLabels={selectedLeadGroup.labels}
                            sendMessage={(text) => inbox.sendMessage(text, activeConversationId || undefined)}
                            updateStatus={inbox.updateStatus}
                            updateLabels={inbox.updateLabels}
                            assignToAgent={inbox.assignToAgent}
                          />
                          {!panelOpen && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs h-9 gap-2 font-semibold"
                              onClick={() => setPanelOpen(true)}
                            >
                              <PanelRightOpen className="h-3.5 w-3.5" /> Ver detalhes do lead
                            </Button>
                          )}
                          <div className="border-t my-1" />
                          <div className="flex justify-center">
                            <ConversationActions
                              conversation={selectedLeadGroup}
                              onRefresh={() => inbox.refresh()}
                              onUpdateStatus={inbox.updateStatus}
                              onUpdatePriority={inbox.updatePriority}
                              onAssignToAgent={inbox.assignToAgent}
                              onUpdateLabels={inbox.updateLabels}
                              onDeleteLead={() => setDeleteConfirmOpen(true)}
                              onMergeLeads={() => setMergeModalOpen(true)}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      /* Erro 1: textos viram ícones + tooltip */
                      <>
                        <div className="flex items-center gap-1 p-1 bg-secondary/30 rounded-xl border border-[hsl(var(--border-strong))]">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Resolver conversa"
                                className="h-8 w-8 rounded-lg hover:bg-green-500/10 hover:text-green-600 transition-colors"
                                onClick={() => inbox.updateStatus(inbox.selectedLeadId!, "resolved")}
                              >
                                <CheckSquare className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Resolver conversa</TooltipContent>
                          </Tooltip>
                          <div className="w-px h-4 bg-border/50" />
                          <SnoozePopover
                            iconOnly
                            onSnooze={(until) => inbox.snoozeConversation(inbox.selectedLeadId!, until)}
                          />
                          <div className="w-px h-4 bg-border/50" />
                          <MacrosDropdown
                            iconOnly
                            leadId={inbox.selectedLeadId!}
                            conversationId={activeConversationId || undefined}
                            currentLabels={selectedLeadGroup.labels}
                            sendMessage={(text) => inbox.sendMessage(text, activeConversationId || undefined)}
                            updateStatus={inbox.updateStatus}
                            updateLabels={inbox.updateLabels}
                            assignToAgent={inbox.assignToAgent}
                          />
                        </div>
                        {/* Erro 3/4: botão de recolher vive no painel; aqui só o de abrir, quando fechado */}
                        {!panelOpen && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Mostrar painel do lead"
                                className="h-8 w-8 shrink-0"
                                onClick={() => setPanelOpen(true)}
                              >
                                <PanelRightOpen className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Mostrar painel do lead</TooltipContent>
                          </Tooltip>
                        )}
                        <ConversationActions
                          conversation={selectedLeadGroup}
                          onRefresh={() => inbox.refresh()}
                          onUpdateStatus={inbox.updateStatus}
                          onUpdatePriority={inbox.updatePriority}
                          onAssignToAgent={inbox.assignToAgent}
                          onUpdateLabels={inbox.updateLabels}
                          onDeleteLead={() => setDeleteConfirmOpen(true)}
                          onMergeLeads={() => setMergeModalOpen(true)}
                        />
                      </>
                    )}
                  </TooltipProvider>
                </div>
              </div>

              {/* Messages timeline */}
              <div className="flex-1 overflow-auto p-4 space-y-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent">
                {inbox.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <MessageSquare className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Nenhuma mensagem ainda</p>
                    <p className="text-xs text-muted-foreground mt-1">Inicie a conversa enviando uma mensagem abaixo</p>
                  </div>
                ) : (
                  <>
                    {inbox.messages.map((msg, i) => {
                      const isOutbound = msg.direction === "outbound";
                      const prevMsg = i > 0 ? inbox.messages[i - 1] : null;
                      const nextMsg = i < inbox.messages.length - 1 ? inbox.messages[i + 1] : null;
                      
                      const msgDate = new Date(msg.created_at).toLocaleDateString("pt-BR");
                      const prevDate = prevMsg ? new Date(prevMsg.created_at).toLocaleDateString("pt-BR") : null;
                      const showDate = !prevDate || msgDate !== prevDate;

                      // Channel change indicator
                      const prevChannel = prevMsg?.channel;
                      const currentChannel = msg.channel;
                      const showChannelChange = prevMsg && currentChannel && prevChannel && currentChannel !== prevChannel;
                      
                      const isConsecutivePrev = prevMsg && prevMsg.direction === msg.direction && 
                        (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 60000) &&
                        prevMsg.is_private === msg.is_private;
                      
                      const isConsecutiveNext = nextMsg && nextMsg.direction === msg.direction && 
                        (new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime() < 60000) &&
                        nextMsg.is_private === msg.is_private;

                      const ChannelIcon = CHANNEL_ICONS[msg.channel || ""] || MessageCircle;
                      
                      // Chat scope bubble styling
                      let borderRadius = "rounded-card";
                      if (isOutbound) {
                        if (!isConsecutivePrev && !isConsecutiveNext) borderRadius = "rounded-card rounded-br-none";
                        else if (!isConsecutivePrev && isConsecutiveNext) borderRadius = "rounded-card rounded-br-none";
                        else if (isConsecutivePrev && isConsecutiveNext) borderRadius = "rounded-card rounded-tr-sm rounded-br-sm";
                        else if (isConsecutivePrev && !isConsecutiveNext) borderRadius = "rounded-card rounded-tr-sm";
                      } else {
                        if (!isConsecutivePrev && !isConsecutiveNext) borderRadius = "rounded-card rounded-bl-none";
                        else if (!isConsecutivePrev && isConsecutiveNext) borderRadius = "rounded-card rounded-bl-none";
                        else if (isConsecutivePrev && isConsecutiveNext) borderRadius = "rounded-card rounded-tl-sm rounded-bl-sm";
                        else if (isConsecutivePrev && !isConsecutiveNext) borderRadius = "rounded-card rounded-tl-sm";
                      }

                      return (
                        <div key={msg.id} className={showDate ? "pt-2" : ""}>
                          {showDate && (
                            <div className="flex items-center gap-4 my-6">
                              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest bg-background px-2">{msgDate}</span>
                              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                            </div>
                          )}
                          {showChannelChange && (() => {
                            const ChIcon = CHANNEL_ICONS[currentChannel || ""] || MessageCircle;
                            const label = CHANNEL_LABELS[currentChannel || ""] || currentChannel;
                            return (
                              <div className="flex items-center gap-3 my-4">
                                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 border border-[hsl(var(--border-strong))]">
                                  <ChIcon className={`h-3 w-3 ${CHANNEL_COLORS[currentChannel || ""] ? "text-primary" : "text-muted-foreground"}`} />
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-primary/70">
                                    Canal alterado para {label}
                                  </span>
                                </div>
                                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                              </div>
                            );
                          })()}
                          <div className={`flex items-end gap-2 ${isConsecutivePrev ? "mt-0.5" : "mt-4"} ${isOutbound ? "justify-end" : "justify-start"}`}>
                            {!isOutbound && !isConsecutivePrev && (
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mb-1">
                                {initials(selectedLeadGroup.lead_name || "?")}
                              </div>
                            )}
                            {isOutbound && isConsecutivePrev && <div className="w-6" />}
                            
                            <div className={`relative group max-w-[70%]`}>
                              {msg.is_private && !isConsecutivePrev && (
                                <div className="flex items-center gap-1 px-2 mb-1">
                                  <Lock className="h-2.5 w-2.5 text-amber-600" />
                                  <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">Nota Privada</span>
                                </div>
                              )}
                              <div className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-all duration-200 ${borderRadius} ${
                                msg.is_private
                                  ? "bg-amber-100 border border-amber-200 text-amber-900"
                                  : isOutbound
                                    ? "bg-muted border border-border text-foreground"
                                    : "bg-primary text-primary-foreground font-medium"
                              }`}>
                                {msg.type === "image" && (
                                  <div className="relative group/media mb-1 -mx-2 -mt-1 overflow-hidden rounded-lg cursor-pointer" onClick={() => setMediaViewer({ url: msg.content, type: "image", id: msg.id, metadata: msg.metadata })}>
                                    <img src={msg.content} alt="Imagem" className="max-w-full h-auto object-cover max-h-64 rounded-lg hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
                                      <Maximize2 className="h-6 w-6 text-white" />
                                    </div>
                                  </div>
                                )}

                                {msg.type === "sticker" && (
                                  <div className="flex justify-center p-1 -mx-2 -mt-1 cursor-pointer" onClick={() => setMediaViewer({ url: msg.content, type: "image", id: msg.id, metadata: msg.metadata })}>
                                    <img src={msg.content} alt="Sticker" className="w-32 h-32 object-contain hover:scale-110 transition-transform" />
                                  </div>
                                )}

                                {msg.type === "video" && (() => {
                                  const videoUrl = msg.content;
                                  const hasValidUrl = videoUrl && !videoUrl.startsWith("[") && !videoUrl.includes(".enc");
                                  return (
                                    <div className="relative group/media mb-1 -mx-2 -mt-1 overflow-hidden rounded-lg cursor-pointer" onClick={() => setMediaViewer({ url: videoUrl, type: "video", id: msg.id, metadata: msg.metadata })}>
                                      {hasValidUrl ? (
                                        <video src={videoUrl} preload="metadata" muted playsInline className="max-w-full h-auto max-h-64 rounded-lg bg-black" onLoadedMetadata={(e) => {
                                          const v = e.target as HTMLVideoElement;
                                          v.currentTime = 1;
                                        }} />
                                      ) : (
                                        <div className="w-full h-40 bg-black rounded-lg flex items-center justify-center">
                                          <span className="text-white/50 text-xs">Vídeo</span>
                                        </div>
                                      )}
                                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <div className="h-14 w-14 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                                          <PlayCircle className="h-8 w-8 text-white drop-shadow-lg" />
                                        </div>
                                      </div>
                                      {msg.metadata?.seconds && (
                                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                          {Math.floor(Number(msg.metadata.seconds) / 60)}:{String(Number(msg.metadata.seconds) % 60).padStart(2, '0')}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {msg.type === "location" && (
                                  <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${msg.metadata?.latitude || ''},${msg.metadata?.longitude || ''}`}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl border border-[hsl(var(--border-strong))] hover:bg-secondary/50 transition-all group"
                                  >
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                      <MapPin className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-bold truncate">{msg.metadata?.name || "Localização"}</p>
                                      <p className="text-[9px] text-muted-foreground uppercase truncate">{msg.metadata?.address || "Ver no Google Maps"}</p>
                                    </div>
                                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                  </a>
                                )}

                                {msg.type === "contact" && (
                                  <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl border border-[hsl(var(--border-strong))] group/contact">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover/contact:bg-primary group-hover/contact:text-white transition-colors">
                                      <UserSquare2 className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-bold truncate">{msg.metadata?.sender_name || msg.sender_name || "Contato"}</p>
                                      <p className="text-[9px] text-muted-foreground uppercase truncate">VCard / Contato</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => toast.info("Função de salvar contato em breve")}>
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}

                                {msg.type === "audio" && (() => {
                                  const audioId = `audio-${msg.id}`;
                                  const duration = msg.metadata?.seconds ? Number(msg.metadata.seconds) : 0;
                                  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
                                  return (
                                    <div className="space-y-2 py-1">
                                      <div className={`flex items-center gap-3 p-2.5 rounded-card w-full min-w-0 ${!isOutbound ? 'bg-white/15' : 'bg-secondary/60 border border-[hsl(var(--border-strong))]'}`}>
                                        <button
                                          className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-all shadow-md ${!isOutbound ? 'bg-white/25 hover:bg-white/35 text-white' : 'bg-primary/15 hover:bg-primary/25 text-primary'}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const audio = document.getElementById(audioId) as HTMLAudioElement;
                                            if (audio) { if (audio.paused) { audio.play(); } else { audio.pause(); } }
                                          }}
                                        >
                                          <PlayCircle className="h-5 w-5" />
                                        </button>
                                        <div className="flex-1 min-w-0 space-y-1.5">
                                          <div className={`h-1.5 rounded-full overflow-hidden ${!isOutbound ? 'bg-white/20' : 'bg-border'}`}>
                                            <div className="h-full w-0 rounded-full bg-current transition-all" id={`progress-${msg.id}`} />
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <span className={`text-[9px] font-bold ${!isOutbound ? 'text-white/60' : 'text-muted-foreground'}`} id={`time-${msg.id}`}>0:00</span>
                                            <span className={`text-[9px] font-bold ${!isOutbound ? 'text-white/60' : 'text-muted-foreground'}`}>{duration ? formatTime(duration) : '--:--'}</span>
                                          </div>
                                        </div>
                                        <audio
                                          id={audioId}
                                          src={msg.content}
                                          preload="metadata"
                                          onTimeUpdate={(e) => {
                                            const a = e.target as HTMLAudioElement;
                                            const pct = a.duration ? (a.currentTime / a.duration) * 100 : 0;
                                            const bar = document.getElementById(`progress-${msg.id}`);
                                            const timeEl = document.getElementById(`time-${msg.id}`);
                                            if (bar) bar.style.width = `${pct}%`;
                                            if (timeEl) timeEl.textContent = formatTime(a.currentTime);
                                          }}
                                          onEnded={() => {
                                            const bar = document.getElementById(`progress-${msg.id}`);
                                            if (bar) bar.style.width = '0%';
                                          }}
                                          className="hidden"
                                        />
                                      </div>
                                      {!msg.metadata?.transcript && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-7 text-[10px] gap-1.5 font-bold hover:bg-primary/10 hover:text-primary"
                                          onClick={async () => {
                                            setIsTranscribing(msg.id);
                                            await inbox.transcribeAudio(msg.id);
                                            setIsTranscribing(null);
                                          }}
                                          disabled={isTranscribing === msg.id}
                                        >
                                          {isTranscribing === msg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
                                          {isTranscribing === msg.id ? "TRANSCREVENDO..." : "TRANSCREVER ÁUDIO"}
                                        </Button>
                                      )}
                                      {msg.metadata?.transcript && (
                                        <div className={`mt-1 p-2.5 rounded-xl italic text-[11px] leading-snug ${!isOutbound ? 'bg-white/10 text-white/80' : 'bg-primary/5 border border-[hsl(var(--border-strong))] text-foreground/80'}`}>
                                          "{msg.metadata.transcript}"
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {(msg.type === "file" || msg.type === "document") && (
                                  <div className="flex items-center gap-3 p-2 bg-secondary/30 rounded-xl border border-[hsl(var(--border-strong))] group/file">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover/file:bg-primary group-hover/file:text-white transition-colors">
                                      <File className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-bold truncate">{msg.metadata?.filename || "Documento"}</p>
                                      <p className="text-[9px] text-muted-foreground uppercase">{formatFileSize(msg.metadata?.size) || "Ver arquivo"}</p>
                                    </div>
                                    <a href={msg.content} download target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-lg bg-background flex items-center justify-center text-muted-foreground hover:text-primary hover:shadow-sm transition-all">
                                      <Download className="h-4 w-4" />
                                    </a>
                                  </div>
                                )}

                                {(msg.type === "text" || !msg.type) && msg.content}
                                
                                <div className={`flex items-center justify-end gap-1.5 mt-1 opacity-70`}>
                                  {/* Channel indicator */}
                                  <ChannelIcon className={`h-2.5 w-2.5 opacity-60`} />
                                  <span className="text-[9px] font-medium">
                                    {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  {isOutbound && !msg.is_private && (
                                    <div className="flex items-center ml-0.5">
                                      {/* `delivery_status` é o campo que os webhooks realmente gravam;
                                          `status` era lido aqui e nunca existia, então todo outbound
                                          mostrava um único ✓ para sempre. */}
                                      {msg.metadata?.failed ? (
                                        <AlertCircle className="h-3 w-3 text-destructive" />
                                      ) : msg.metadata?.pending ? (
                                        <Clock className="h-3 w-3 opacity-60" />
                                      ) : (msg.metadata?.delivery_status ?? msg.metadata?.status) === "read" ? (
                                        <CheckCheck className="h-3 w-3 text-primary" />
                                      ) : (msg.metadata?.delivery_status ?? msg.metadata?.status) === "delivered" ? (
                                        <CheckCheck className="h-3 w-3 opacity-60" />
                                      ) : (
                                        <Check className="h-3 w-3 opacity-60" />
                                      )}
                                    </div>
                                  )}
                                </div>

                                {msg.metadata?.failed && (
                                  <button
                                    onClick={() => inbox.retryMessage(msg.id)}
                                    className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-destructive hover:underline"
                                  >
                                    <RefreshCw className="h-2.5 w-2.5" />
                                    Não enviada — tentar de novo
                                  </button>
                                )}
                              </div>
                            </div>

                            {isOutbound && !isConsecutivePrev && (
                              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mb-1 ${
                                msg.is_private ? "bg-amber-500 text-white" : "bg-secondary text-muted-foreground"
                              }`}>
                                VC
                              </div>
                            )}
                            {!isOutbound && isConsecutivePrev && <div className="w-6" />}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

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
