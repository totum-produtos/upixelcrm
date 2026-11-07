import { useState } from "react";
import type { Lead } from "@/types";
import type { useInbox } from "@/hooks/useInbox";

type CreateConversation = ReturnType<typeof useInbox>["createConversation"];

// Estado do modal "Nova conversa" (canal, lead, telefone, e-mail) e o handler de criação.
export function useNewConversationForm(createConversation: CreateConversation, leads: Lead[]) {
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newChannel, setNewChannel] = useState("whatsapp");
  const [newLeadId, setNewLeadId] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const handleCreateConversation = async () => {
    const lead = leads.find(l => l.id === newLeadId);
    const phone = newPhone || lead?.phone || "";
    const email = newEmail || lead?.email || "";
    const name = lead?.name || phone || email || "Nova conversa";

    const id = await createConversation(newChannel, newLeadId || undefined, phone, email, name);
    if (id) {
      // The hook will auto-select the lead
      setNewConvOpen(false);
      setNewLeadId("");
      setNewPhone("");
      setNewEmail("");
    }
  };

  return {
    newConvOpen, setNewConvOpen,
    newChannel, setNewChannel,
    newLeadId, setNewLeadId,
    newPhone, setNewPhone,
    newEmail, setNewEmail,
    handleCreateConversation,
  };
}
