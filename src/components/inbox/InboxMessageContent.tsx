import { File, Download, Maximize2, Activity, MapPin, UserSquare2, PlayCircle, ExternalLink, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/utils";
import type { MediaViewerItem } from "@/hooks/useMediaViewer";
import type { Message } from "@/hooks/useInbox";

interface InboxMessageContentProps {
  msg: Message;
  isOutbound: boolean;
  isTranscribing: string | null;
  onTranscribe: (messageId: string) => Promise<void>;
  onOpenMedia: (item: MediaViewerItem) => void;
}

// Conteúdo da bolha por tipo de mensagem (imagem, sticker, vídeo, localização, contato, áudio, arquivo, texto).
export function InboxMessageContent({ msg, isOutbound, isTranscribing, onTranscribe, onOpenMedia }: InboxMessageContentProps) {
  return (
    <>
      {msg.type === "image" && (
        <div className="relative group/media mb-1 -mx-2 -mt-1 overflow-hidden rounded-lg cursor-pointer" onClick={() => onOpenMedia({ url: msg.content, type: "image", id: msg.id, metadata: msg.metadata })}>
          <img src={msg.content} alt="Imagem" className="max-w-full h-auto object-cover max-h-64 rounded-lg hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
            <Maximize2 className="h-6 w-6 text-white" />
          </div>
        </div>
      )}

      {msg.type === "sticker" && (
        <div className="flex justify-center p-1 -mx-2 -mt-1 cursor-pointer" onClick={() => onOpenMedia({ url: msg.content, type: "image", id: msg.id, metadata: msg.metadata })}>
          <img src={msg.content} alt="Sticker" className="w-32 h-32 object-contain hover:scale-110 transition-transform" />
        </div>
      )}

      {msg.type === "video" && (() => {
        const videoUrl = msg.content;
        const hasValidUrl = videoUrl && !videoUrl.startsWith("[") && !videoUrl.includes(".enc");
        return (
          <div className="relative group/media mb-1 -mx-2 -mt-1 overflow-hidden rounded-lg cursor-pointer" onClick={() => onOpenMedia({ url: videoUrl, type: "video", id: msg.id, metadata: msg.metadata })}>
            {hasValidUrl ? (
              <video src={videoUrl} preload="metadata" muted playsInline className="max-w-full h-auto max-h-64 rounded-lg bg-black" onLoadedMetadata={(e) => {
                const v = e.target as HTMLVideoElement;
                v.currentTime = 1;
              }} />
            ) : (
              <div className="w-full h-40 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white/50 text-xs">Vídeo</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="h-14 w-14 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                <PlayCircle className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
            </div>
            {msg.metadata?.seconds && (
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                {Math.floor(Number(msg.metadata.seconds) / 60)}:{String(Number(msg.metadata.seconds) % 60).padStart(2, '0')}
              </div>
            )}
          </div>
        );
      })()}

      {msg.type === "location" && (
        <a 
          href={`https://www.google.com/maps/search/?api=1&query=${msg.metadata?.latitude || ''},${msg.metadata?.longitude || ''}`}
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl border border-[hsl(var(--border-strong))] hover:bg-secondary/50 transition-all group"
        >
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold truncate">{msg.metadata?.name || "Localização"}</p>
            <p className="text-[9px] text-muted-foreground uppercase truncate">{msg.metadata?.address || "Ver no Google Maps"}</p>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </a>
      )}

      {msg.type === "contact" && (
        <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl border border-[hsl(var(--border-strong))] group/contact">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover/contact:bg-primary group-hover/contact:text-white transition-colors">
            <UserSquare2 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold truncate">{msg.metadata?.sender_name || msg.sender_name || "Contato"}</p>
            <p className="text-[9px] text-muted-foreground uppercase truncate">VCard / Contato</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => toast.info("Função de salvar contato em breve")}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {msg.type === "audio" && (() => {
        const audioId = `audio-${msg.id}`;
        const duration = msg.metadata?.seconds ? Number(msg.metadata.seconds) : 0;
        const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
        return (
          <div className="space-y-2 py-1">
            <div className={`flex items-center gap-3 p-2.5 rounded-card w-full min-w-0 ${!isOutbound ? 'bg-white/15' : 'bg-secondary/60 border border-[hsl(var(--border-strong))]'}`}>
              <button
                className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-all shadow-md ${!isOutbound ? 'bg-white/25 hover:bg-white/35 text-white' : 'bg-primary/15 hover:bg-primary/25 text-primary'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const audio = document.getElementById(audioId) as HTMLAudioElement;
                  if (audio) { if (audio.paused) { audio.play(); } else { audio.pause(); } }
                }}
              >
                <PlayCircle className="h-5 w-5" />
              </button>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className={`h-1.5 rounded-full overflow-hidden ${!isOutbound ? 'bg-white/20' : 'bg-border'}`}>
                  <div className="h-full w-0 rounded-full bg-current transition-all" id={`progress-${msg.id}`} />
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-bold ${!isOutbound ? 'text-white/60' : 'text-muted-foreground'}`} id={`time-${msg.id}`}>0:00</span>
                  <span className={`text-[9px] font-bold ${!isOutbound ? 'text-white/60' : 'text-muted-foreground'}`}>{duration ? formatTime(duration) : '--:--'}</span>
                </div>
              </div>
              <audio
                id={audioId}
                src={msg.content}
                preload="metadata"
                onTimeUpdate={(e) => {
                  const a = e.target as HTMLAudioElement;
                  const pct = a.duration ? (a.currentTime / a.duration) * 100 : 0;
                  const bar = document.getElementById(`progress-${msg.id}`);
                  const timeEl = document.getElementById(`time-${msg.id}`);
                  if (bar) bar.style.width = `${pct}%`;
                  if (timeEl) timeEl.textContent = formatTime(a.currentTime);
                }}
                onEnded={() => {
                  const bar = document.getElementById(`progress-${msg.id}`);
                  if (bar) bar.style.width = '0%';
                }}
                className="hidden"
              />
            </div>
            {!msg.metadata?.transcript && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-[10px] gap-1.5 font-bold hover:bg-primary/10 hover:text-primary"
                onClick={() => onTranscribe(msg.id)}
                disabled={isTranscribing === msg.id}
              >
                {isTranscribing === msg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
                {isTranscribing === msg.id ? "TRANSCREVENDO..." : "TRANSCREVER ÁUDIO"}
              </Button>
            )}
            {msg.metadata?.transcript && (
              <div className={`mt-1 p-2.5 rounded-xl italic text-[11px] leading-snug ${!isOutbound ? 'bg-white/10 text-white/80' : 'bg-primary/5 border border-[hsl(var(--border-strong))] text-foreground/80'}`}>
                "{msg.metadata.transcript}"
              </div>
            )}
          </div>
        );
      })()}

      {(msg.type === "file" || msg.type === "document") && (
        <div className="flex items-center gap-3 p-2 bg-secondary/30 rounded-xl border border-[hsl(var(--border-strong))] group/file">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover/file:bg-primary group-hover/file:text-white transition-colors">
            <File className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold truncate">{msg.metadata?.filename || "Documento"}</p>
            <p className="text-[9px] text-muted-foreground uppercase">{formatFileSize(msg.metadata?.size) || "Ver arquivo"}</p>
          </div>
          <a href={msg.content} download target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-lg bg-background flex items-center justify-center text-muted-foreground hover:text-primary hover:shadow-sm transition-all">
            <Download className="h-4 w-4" />
          </a>
        </div>
      )}

      {(msg.type === "text" || !msg.type) && msg.content}
    </>
  );
}
