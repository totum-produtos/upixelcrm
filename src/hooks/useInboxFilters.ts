import { useState, useMemo } from "react";
import type { LeadConversation } from "@/hooks/useInbox";

// Estado dos filtros da lista de conversas (aba de status, canal, não lidas, busca)
// e a lista filtrada resultante.
export function useInboxFilters(conversations: LeadConversation[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [inboxTab, setInboxTab] = useState<string>("abertas");

  const filteredConversations = useMemo(() => {
    let result = conversations;

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
  }, [conversations, searchQuery, channelFilter, unreadOnly, inboxTab]);

  return {
    searchQuery, setSearchQuery,
    channelFilter, setChannelFilter,
    unreadOnly, setUnreadOnly,
    inboxTab, setInboxTab,
    filteredConversations,
  };
}
