import { useState } from "react";
import { toast } from "sonner";
import { ReplyBox } from "@/components/inbox/ReplyBox";
import { CHANNEL_LABELS } from "@/lib/inbox-ui";
import type { useInbox, LeadConversation } from "@/hooks/useInbox";

type InboxState = ReturnType<typeof useInbox>;

interface InboxComposerProps {
  selectedLeadGroup: LeadConversation;
  selectedLeadId: string | null;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  agentName: string | undefined;
  sendMessage: InboxState["sendMessage"];
  sendWhatsAppMedia: InboxState["sendWhatsAppMedia"];
  createConversation: InboxState["createConversation"];
}

// Compositor de respostas: controla o estado "enviando" e liga o ReplyBox aos envios de texto,
// mídia (WhatsApp) e à criação de novo canal da conversa.
export function InboxComposer({
  selectedLeadGroup, selectedLeadId, activeConversationId, setActiveConversationId, agentName,
  sendMessage, sendWhatsAppMedia, createConversation,
}: InboxComposerProps) {
  const [sending, setSending] = useState(false);

  return (
    <ReplyBox
      onSend={async (text, isPrivate, targetId) => {
        setSending(true);
        try {
          await sendMessage(text, targetId, isPrivate);
        } finally {
          setSending(false);
        }
      }}
      onSendMedia={async (file, targetId) => {
        setSending(true);
        try {
          if (!selectedLeadId) {
            toast.error("Selecione um contato primeiro.");
            return;
          }
          await sendWhatsAppMedia(selectedLeadId, file, targetId);
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
      agentName={agentName}
      onAddChannel={async (channel) => {
        const phone = selectedLeadGroup.lead_phone || "";
        const email = selectedLeadGroup.lead_email || "";
        const name = selectedLeadGroup.lead_name || "";
        const newId = await createConversation(
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
  );
}
