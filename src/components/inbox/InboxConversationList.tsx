import type { ReactNode } from "react";
import { Loader2, MessageCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InboxConversationItem } from "@/components/inbox/InboxConversationItem";
import type { LeadConversation } from "@/hooks/useInbox";

interface InboxConversationListProps {
  isMobile: boolean;
  mobileView: "list" | "chat";
  conversations: LeadConversation[];
  loading: boolean;
  selectedLeadId: string | null;
  selectionMode: boolean;
  isSelected: (id: string) => boolean;
  toggleLead: (id: string) => void;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  selectAll: (ids: string[]) => void;
  onSelectConversation: (conversation: LeadConversation) => void;
  onNewConversation: () => void;
  onQuickLog: (leadId: string, type: "call" | "call_attempt") => void;
  header: ReactNode;
}

// Coluna da lista de conversas: cabeçalho com filtros, barra de seleção em massa e linhas.
export function InboxConversationList({
  isMobile, mobileView, conversations, loading, selectedLeadId, selectionMode, isSelected, toggleLead,
  enterSelectionMode, exitSelectionMode, selectAll, onSelectConversation, onNewConversation, onQuickLog, header,
}: InboxConversationListProps) {
  return (
    <div className={`${isMobile ? (mobileView === "chat" ? "hidden" : "w-full") : "w-80 shrink-0"} ghost-border border-r flex flex-col`}>
      {header}
      {selectionMode && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/40 border-b border-[hsl(var(--border-strong))] text-[11px]">
          <button
            className="text-primary font-semibold hover:underline"
            onClick={() => selectAll(conversations.map((c) => c.lead_id))}
          >
            Selecionar {conversations.length} visíveis
          </button>
          <button className="text-muted-foreground hover:text-foreground" onClick={exitSelectionMode}>
            Cancelar
          </button>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <MessageCircle className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground text-center">Nenhuma conversa encontrada</p>
            <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => onNewConversation()}>
              <Plus className="h-3 w-3 mr-1" /> Nova conversa
            </Button>
          </div>
        ) : (
          conversations.map(c => (
            <InboxConversationItem
              key={c.lead_id}
              conversation={c}
              isActive={selectedLeadId === c.lead_id}
              selectionMode={selectionMode}
              checked={isSelected(c.lead_id)}
              onSelect={onSelectConversation}
              onToggleLead={toggleLead}
              onEnterSelectionMode={enterSelectionMode}
              onQuickLog={onQuickLog}
            />
          ))
        )}
      </div>
    </div>
  );
}
