import type { Ref } from "react";
import { MoreVertical, CheckSquare, PanelRightOpen, ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConversationActions } from "@/components/inbox/ConversationActions";
import { SnoozePopover } from "@/components/inbox/SnoozePopover";
import { MacrosDropdown } from "@/components/inbox/MacrosDropdown";
import { ConversationStatusBadge } from "@/components/inbox/ConversationStatusBadge";
import { CHANNEL_COLORS, CHANNEL_LABELS, CHANNEL_ICONS, initials } from "@/lib/inbox-ui";
import type { useInbox, LeadConversation } from "@/hooks/useInbox";
import type { PipelineColumn } from "@/types";

type InboxState = ReturnType<typeof useInbox>;

interface InboxChatHeaderProps {
  chatHeaderRef: Ref<HTMLDivElement>;
  isMobile: boolean;
  compactActions: boolean;
  onBackToList: () => void;
  onTogglePanel: () => void;
  panelOpen: boolean;
  onPanelOpenChange: (open: boolean) => void;
  selectedLeadGroup: LeadConversation;
  selectedLeadId: string | null;
  leadColumn: PipelineColumn | undefined;
  activeConversationId: string | null;
  updateStatus: InboxState["updateStatus"];
  updatePriority: InboxState["updatePriority"];
  snoozeConversation: InboxState["snoozeConversation"];
  sendMessage: InboxState["sendMessage"];
  updateLabels: InboxState["updateLabels"];
  assignToAgent: InboxState["assignToAgent"];
  onRefresh: InboxState["refresh"];
  onDeleteLead: () => void;
  onMergeLeads: () => void;
}

// Cabeçalho do chat: contato, canais, estágio do funil e ações da conversa
// (colapsadas num popover quando a largura é curta).
export function InboxChatHeader({
  chatHeaderRef, isMobile, compactActions, onBackToList, onTogglePanel, panelOpen, onPanelOpenChange,
  selectedLeadGroup, selectedLeadId, leadColumn, activeConversationId, updateStatus, updatePriority,
  snoozeConversation, sendMessage, updateLabels, assignToAgent, onRefresh, onDeleteLead, onMergeLeads,
}: InboxChatHeaderProps) {
  return (
    <div ref={chatHeaderRef} className="px-4 py-2.5 ghost-border border-b flex items-center justify-between shrink-0 bg-card z-10">
      <div className="flex items-center gap-3 min-w-0">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Voltar para a lista"
            className="h-8 w-8 shrink-0 -ml-1"
            onClick={() => onBackToList()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="relative group cursor-pointer shrink-0" onClick={onTogglePanel}>
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
                  onClick={() => updateStatus(selectedLeadId!, "resolved")}
                >
                  <CheckSquare className="h-3.5 w-3.5" /> Resolver conversa
                </Button>
                <SnoozePopover
                  onSnooze={(until) => snoozeConversation(selectedLeadId!, until)}
                />
                <MacrosDropdown
                  leadId={selectedLeadId!}
                  conversationId={activeConversationId || undefined}
                  currentLabels={selectedLeadGroup.labels}
                  sendMessage={(text) => sendMessage(text, activeConversationId || undefined)}
                  updateStatus={updateStatus}
                  updateLabels={updateLabels}
                  assignToAgent={assignToAgent}
                />
                {!panelOpen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-9 gap-2 font-semibold"
                    onClick={() => onPanelOpenChange(true)}
                  >
                    <PanelRightOpen className="h-3.5 w-3.5" /> Ver detalhes do lead
                  </Button>
                )}
                <div className="border-t my-1" />
                <div className="flex justify-center">
                  <ConversationActions
                    conversation={selectedLeadGroup}
                    onRefresh={() => onRefresh()}
                    onUpdateStatus={updateStatus}
                    onUpdatePriority={updatePriority}
                    onAssignToAgent={assignToAgent}
                    onUpdateLabels={updateLabels}
                    onDeleteLead={() => onDeleteLead()}
                    onMergeLeads={() => onMergeLeads()}
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
                      onClick={() => updateStatus(selectedLeadId!, "resolved")}
                    >
                      <CheckSquare className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Resolver conversa</TooltipContent>
                </Tooltip>
                <div className="w-px h-4 bg-border/50" />
                <SnoozePopover
                  iconOnly
                  onSnooze={(until) => snoozeConversation(selectedLeadId!, until)}
                />
                <div className="w-px h-4 bg-border/50" />
                <MacrosDropdown
                  iconOnly
                  leadId={selectedLeadId!}
                  conversationId={activeConversationId || undefined}
                  currentLabels={selectedLeadGroup.labels}
                  sendMessage={(text) => sendMessage(text, activeConversationId || undefined)}
                  updateStatus={updateStatus}
                  updateLabels={updateLabels}
                  assignToAgent={assignToAgent}
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
                      onClick={() => onPanelOpenChange(true)}
                    >
                      <PanelRightOpen className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mostrar painel do lead</TooltipContent>
                </Tooltip>
              )}
              <ConversationActions
                conversation={selectedLeadGroup}
                onRefresh={() => onRefresh()}
                onUpdateStatus={updateStatus}
                onUpdatePriority={updatePriority}
                onAssignToAgent={assignToAgent}
                onUpdateLabels={updateLabels}
                onDeleteLead={() => onDeleteLead()}
                onMergeLeads={() => onMergeLeads()}
              />
            </>
          )}
        </TooltipProvider>
      </div>
    </div>
  );
}
