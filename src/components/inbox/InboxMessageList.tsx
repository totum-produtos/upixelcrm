import { useState } from "react";
import type { RefObject } from "react";
import { MessageSquare } from "lucide-react";
import { InboxMessageItem } from "@/components/inbox/InboxMessageItem";
import type { MediaViewerItem } from "@/hooks/useMediaViewer";
import type { useInbox, Message } from "@/hooks/useInbox";

type InboxState = ReturnType<typeof useInbox>;

interface InboxMessageListProps {
  messages: Message[];
  leadName: string;
  messagesEndRef: RefObject<HTMLDivElement>;
  onOpenMedia: (item: MediaViewerItem) => void;
  retryMessage: InboxState["retryMessage"];
  transcribeAudio: InboxState["transcribeAudio"];
}

// Timeline de mensagens da conversa aberta (ou estado vazio quando ainda não há mensagens).
export function InboxMessageList({
  messages, leadName, messagesEndRef, onOpenMedia, retryMessage, transcribeAudio,
}: InboxMessageListProps) {
  const [isTranscribing, setIsTranscribing] = useState<string | null>(null);

  const handleTranscribe = async (messageId: string) => {
    setIsTranscribing(messageId);
    await transcribeAudio(messageId);
    setIsTranscribing(null);
  };

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground/20" />
          </div>
          <p className="text-sm font-medium text-foreground">Nenhuma mensagem ainda</p>
          <p className="text-xs text-muted-foreground mt-1">Inicie a conversa enviando uma mensagem abaixo</p>
        </div>
      ) : (
        <>
          {messages.map((msg, i) => {
            const prevMsg = i > 0 ? messages[i - 1] : null;
            const nextMsg = i < messages.length - 1 ? messages[i + 1] : null;
            return (
              <InboxMessageItem
                key={msg.id}
                msg={msg}
                prevMsg={prevMsg}
                nextMsg={nextMsg}
                leadName={leadName}
                isTranscribing={isTranscribing}
                onTranscribe={handleTranscribe}
                onOpenMedia={onOpenMedia}
                retryMessage={retryMessage}
              />
            );
          })}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}
