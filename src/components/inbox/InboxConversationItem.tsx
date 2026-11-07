import { Phone, PhoneMissed, MessageCircle, CheckCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ConversationStatusBadge } from "@/components/inbox/ConversationStatusBadge";
import { PriorityBadge } from "@/components/inbox/PriorityBadge";
import { CHANNEL_COLORS, CHANNEL_ICONS, formatTime, initials } from "@/lib/inbox-ui";
import type { LeadConversation } from "@/hooks/useInbox";

interface InboxConversationItemProps {
  conversation: LeadConversation;
  isActive: boolean;
  selectionMode: boolean;
  checked: boolean;
  onSelect: (conversation: LeadConversation) => void;
  onToggleLead: (leadId: string) => void;
  onEnterSelectionMode: () => void;
  onQuickLog: (leadId: string, type: "call" | "call_attempt") => void;
}

// Linha da lista de conversas: avatar, canais, última mensagem, badges e ações rápidas.
export function InboxConversationItem({
  conversation: c, isActive, selectionMode, checked, onSelect, onToggleLead, onEnterSelectionMode, onQuickLog,
}: InboxConversationItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(c)}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        onSelect(c);
      }}
      className={`group w-full flex items-start gap-3 p-3 text-left hover:bg-secondary transition-all duration-200 border-b border-[hsl(var(--border-strong))] relative cursor-pointer ${
        isActive ? "bg-primary/5 shadow-[inset_3px_0_0_0_#9b87f5]" : ""
      }`}
    >
      <div
        className={`shrink-0 self-center transition-opacity ${selectionMode || checked ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!selectionMode) onEnterSelectionMode();
          onToggleLead(c.lead_id);
        }}
      >
        <Checkbox checked={checked} aria-label={`Selecionar conversa com ${c.lead_name}`} />
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
          onClick={(e) => { e.stopPropagation(); onQuickLog(c.lead_id, "call_attempt"); }}
        >
          <PhoneMissed className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button
          title="Registrar ligação"
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-secondary"
          onClick={(e) => { e.stopPropagation(); onQuickLog(c.lead_id, "call"); }}
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
  );
}
