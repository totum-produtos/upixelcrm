import { Lock, Check, CheckCheck, Clock, AlertCircle, RefreshCw, MessageCircle } from "lucide-react";
import { CHANNEL_COLORS, CHANNEL_LABELS, CHANNEL_ICONS, initials } from "@/lib/inbox-ui";
import { InboxMessageContent } from "@/components/inbox/InboxMessageContent";
import type { MediaViewerItem } from "@/hooks/useMediaViewer";
import type { useInbox, Message } from "@/hooks/useInbox";

interface InboxMessageItemProps {
  msg: Message;
  prevMsg: Message | null;
  nextMsg: Message | null;
  leadName: string;
  isTranscribing: string | null;
  onTranscribe: (messageId: string) => Promise<void>;
  onOpenMedia: (item: MediaViewerItem) => void;
  retryMessage: ReturnType<typeof useInbox>["retryMessage"];
}

// Uma mensagem da timeline: separador de data, troca de canal, avatar, bolha e status de entrega.
export function InboxMessageItem({
  msg, prevMsg, nextMsg, leadName, isTranscribing, onTranscribe, onOpenMedia, retryMessage,
}: InboxMessageItemProps) {
  const isOutbound = msg.direction === "outbound";
  
  const msgDate = new Date(msg.created_at).toLocaleDateString("pt-BR");
  const prevDate = prevMsg ? new Date(prevMsg.created_at).toLocaleDateString("pt-BR") : null;
  const showDate = !prevDate || msgDate !== prevDate;

  // Channel change indicator
  const prevChannel = prevMsg?.channel;
  const currentChannel = msg.channel;
  const showChannelChange = prevMsg && currentChannel && prevChannel && currentChannel !== prevChannel;
  
  const isConsecutivePrev = prevMsg && prevMsg.direction === msg.direction && 
    (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 60000) &&
    prevMsg.is_private === msg.is_private;
  
  const isConsecutiveNext = nextMsg && nextMsg.direction === msg.direction && 
    (new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime() < 60000) &&
    nextMsg.is_private === msg.is_private;

  const ChannelIcon = CHANNEL_ICONS[msg.channel || ""] || MessageCircle;
  
  // Chat scope bubble styling
  let borderRadius = "rounded-card";
  if (isOutbound) {
    if (!isConsecutivePrev && !isConsecutiveNext) borderRadius = "rounded-card rounded-br-none";
    else if (!isConsecutivePrev && isConsecutiveNext) borderRadius = "rounded-card rounded-br-none";
    else if (isConsecutivePrev && isConsecutiveNext) borderRadius = "rounded-card rounded-tr-sm rounded-br-sm";
    else if (isConsecutivePrev && !isConsecutiveNext) borderRadius = "rounded-card rounded-tr-sm";
  } else {
    if (!isConsecutivePrev && !isConsecutiveNext) borderRadius = "rounded-card rounded-bl-none";
    else if (!isConsecutivePrev && isConsecutiveNext) borderRadius = "rounded-card rounded-bl-none";
    else if (isConsecutivePrev && isConsecutiveNext) borderRadius = "rounded-card rounded-tl-sm rounded-bl-sm";
    else if (isConsecutivePrev && !isConsecutiveNext) borderRadius = "rounded-card rounded-tl-sm";
  }

  return (
    <div className={showDate ? "pt-2" : ""}>
      {showDate && (
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest bg-background px-2">{msgDate}</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
      )}
      {showChannelChange && (() => {
        const ChIcon = CHANNEL_ICONS[currentChannel || ""] || MessageCircle;
        const label = CHANNEL_LABELS[currentChannel || ""] || currentChannel;
        return (
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 border border-[hsl(var(--border-strong))]">
              <ChIcon className={`h-3 w-3 ${CHANNEL_COLORS[currentChannel || ""] ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-[9px] font-bold uppercase tracking-widest text-primary/70">
                Canal alterado para {label}
              </span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          </div>
        );
      })()}
      <div className={`flex items-end gap-2 ${isConsecutivePrev ? "mt-0.5" : "mt-4"} ${isOutbound ? "justify-end" : "justify-start"}`}>
        {!isOutbound && !isConsecutivePrev && (
          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mb-1">
            {initials(leadName || "?")}
          </div>
        )}
        {isOutbound && isConsecutivePrev && <div className="w-6" />}
        
        <div className={`relative group max-w-[70%]`}>
          {msg.is_private && !isConsecutivePrev && (
            <div className="flex items-center gap-1 px-2 mb-1">
              <Lock className="h-2.5 w-2.5 text-amber-600" />
              <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">Nota Privada</span>
            </div>
          )}
          <div className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-all duration-200 ${borderRadius} ${
            msg.is_private
              ? "bg-amber-100 border border-amber-200 text-amber-900"
              : isOutbound
                ? "bg-muted border border-border text-foreground"
                : "bg-primary text-primary-foreground font-medium"
          }`}>
            <InboxMessageContent
              msg={msg}
              isOutbound={isOutbound}
              isTranscribing={isTranscribing}
              onTranscribe={onTranscribe}
              onOpenMedia={onOpenMedia}
            />
            
            <div className={`flex items-center justify-end gap-1.5 mt-1 opacity-70`}>
              {/* Channel indicator */}
              <ChannelIcon className={`h-2.5 w-2.5 opacity-60`} />
              <span className="text-[9px] font-medium">
                {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
              {isOutbound && !msg.is_private && (
                <div className="flex items-center ml-0.5">
                  {/* `delivery_status` é o campo que os webhooks realmente gravam;
                      `status` era lido aqui e nunca existia, então todo outbound
                      mostrava um único ✓ para sempre. */}
                  {msg.metadata?.failed ? (
                    <AlertCircle className="h-3 w-3 text-destructive" />
                  ) : msg.metadata?.pending ? (
                    <Clock className="h-3 w-3 opacity-60" />
                  ) : (msg.metadata?.delivery_status ?? msg.metadata?.status) === "read" ? (
                    <CheckCheck className="h-3 w-3 text-primary" />
                  ) : (msg.metadata?.delivery_status ?? msg.metadata?.status) === "delivered" ? (
                    <CheckCheck className="h-3 w-3 opacity-60" />
                  ) : (
                    <Check className="h-3 w-3 opacity-60" />
                  )}
                </div>
              )}
            </div>

            {msg.metadata?.failed && (
              <button
                onClick={() => retryMessage(msg.id)}
                className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-destructive hover:underline"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                Não enviada — tentar de novo
              </button>
            )}
          </div>
        </div>

        {isOutbound && !isConsecutivePrev && (
          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mb-1 ${
            msg.is_private ? "bg-amber-500 text-white" : "bg-secondary text-muted-foreground"
          }`}>
            VC
          </div>
        )}
        {!isOutbound && isConsecutivePrev && <div className="w-6" />}
      </div>
    </div>
  );
}
