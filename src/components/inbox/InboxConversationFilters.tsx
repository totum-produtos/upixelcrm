import type { Dispatch, SetStateAction } from "react";
import { Search, Plus, List, MessageCircle, MessageSquareDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CHANNEL_ICONS, CHANNEL_LABELS } from "@/lib/inbox-ui";

interface InboxConversationFiltersProps {
  inboxTab: string;
  onTabChange: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  channelFilter: string;
  onChannelFilterChange: (channel: string) => void;
  unreadOnly: boolean;
  onUnreadOnlyChange: Dispatch<SetStateAction<boolean>>;
  onNewConversation: () => void;
}

// Cabeçalho da lista: abas de status, botão de nova conversa, busca e filtros de canal/não lidas.
export function InboxConversationFilters({
  inboxTab, onTabChange, searchQuery, onSearchChange, channelFilter, onChannelFilterChange,
  unreadOnly, onUnreadOnlyChange, onNewConversation,
}: InboxConversationFiltersProps) {
  return (
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
              onClick={() => onTabChange(tab.key)}
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
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onNewConversation()}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
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
                  onClick={() => onChannelFilterChange(ch)}
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
              onClick={() => onUnreadOnlyChange(v => !v)}
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
  );
}
