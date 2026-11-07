import { MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InboxEmptyStateProps {
  onNewConversation: () => void;
}

// Estado vazio da área de chat, exibido enquanto nenhuma conversa está selecionada.
export function InboxEmptyState({ onNewConversation }: InboxEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent">
      <div className="h-20 w-20 rounded-card bg-secondary flex items-center justify-center mb-6 animate-pulse">
        <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
      </div>
      <h3 className="text-lg font-bold text-foreground">Sua Inbox</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs text-center">Selecione um lead ao lado para visualizar o histórico de mensagens e responder.</p>
      <Button size="sm" variant="outline" className="mt-6 text-xs shadow-sm rounded-xl px-4" onClick={() => onNewConversation()}>
        <Plus className="h-3.5 w-3.5 mr-1.5 text-primary" /> Nova conversa
      </Button>
    </div>
  );
}
