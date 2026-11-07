import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { X } from "lucide-react";
import { MergeLeadsModal } from "@/components/crm/MergeLeadsModal";
import { InboxBulkActionsBar } from "@/components/inbox/InboxBulkActionsBar";
import { InboxMediaViewer } from "@/components/inbox/InboxMediaViewer";
import { InboxComposer } from "@/components/inbox/InboxComposer";
import { InboxEmptyState } from "@/components/inbox/InboxEmptyState";
import { InboxConversationList } from "@/components/inbox/InboxConversationList";
import { InboxConversationFilters } from "@/components/inbox/InboxConversationFilters";
import { InboxMessageList } from "@/components/inbox/InboxMessageList";
import { InboxChatHeader } from "@/components/inbox/InboxChatHeader";
import { InboxLeadPanel } from "@/components/inbox/InboxLeadPanel";
import { InboxDeleteLeadDialog } from "@/components/inbox/InboxDeleteLeadDialog";
import { InboxNewConversationDialog } from "@/components/inbox/InboxNewConversationDialog";
import { SelectionProvider, useSelection } from "@/contexts/SelectionContext";
import { CreateTaskModal } from "@/components/crm/CreateTaskModal";
import { AddTagModal } from "@/components/crm/AddTagModal";
import { useAppState } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useInbox } from "@/hooks/useInbox";
import type { LeadConversation } from "@/hooks/useInbox";
import { useCsatSender } from "@/hooks/useCsatSender";
import { useInboxFilters } from "@/hooks/useInboxFilters";
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

  
  const {
    searchQuery, setSearchQuery, channelFilter, setChannelFilter, unreadOnly, setUnreadOnly,
    inboxTab, setInboxTab, filteredConversations,
  } = useInboxFilters(inbox.conversations);
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

  const handleSelectConversation = (c: LeadConversation) => {
    if (selectionMode) { toggleLead(c.lead_id); return; }
    inbox.selectLead(c.lead_id);
    setActiveConversationId(c.source_conversations[0]?.id || null);
    setMobileView("chat");
  };

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
        <InboxConversationList
          isMobile={isMobile}
          mobileView={mobileView}
          conversations={filteredConversations}
          loading={inbox.loading}
          selectedLeadId={inbox.selectedLeadId}
          selectionMode={selectionMode}
          isSelected={isSelected}
          toggleLead={toggleLead}
          enterSelectionMode={enterSelectionMode}
          exitSelectionMode={exitSelectionMode}
          selectAll={selectAll}
          onSelectConversation={handleSelectConversation}
          onNewConversation={() => setNewConvOpen(true)}
          onQuickLog={openQuickLog}
          header={
            <InboxConversationFilters
              inboxTab={inboxTab}
              onTabChange={setInboxTab}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              channelFilter={channelFilter}
              onChannelFilterChange={setChannelFilter}
              onUnreadOnlyChange={setUnreadOnly}
              unreadOnly={unreadOnly}
              onNewConversation={() => setNewConvOpen(true)}
            />
          }
        />

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
                <InboxComposer
                  selectedLeadGroup={selectedLeadGroup}
                  selectedLeadId={inbox.selectedLeadId}
                  activeConversationId={activeConversationId}
                  setActiveConversationId={setActiveConversationId}
                  agentName={user?.name}
                  sendMessage={inbox.sendMessage}
                  sendWhatsAppMedia={inbox.sendWhatsAppMedia}
                  createConversation={inbox.createConversation}
                />
              )}
            </>
          ) : (
            <InboxEmptyState onNewConversation={() => setNewConvOpen(true)} />
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
