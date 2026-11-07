import { ExternalLink, Download, X, ChevronLeft, ChevronRight, Maximize2, PlayCircle, VideoOff, File } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { MediaViewerItem } from "@/hooks/useMediaViewer";

interface InboxMediaViewerProps {
  mediaViewer: MediaViewerItem;
  currentMediaIndex: number;
  totalMedia: number;
  onClose: () => void;
  onNavigate: (dir: "prev" | "next") => void;
}

// Lightbox de mídia (imagem, vídeo, documento) com navegação pela galeria da conversa.
export function InboxMediaViewer({ mediaViewer, currentMediaIndex, totalMedia, onClose, onNavigate }: InboxMediaViewerProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-[101]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
            {mediaViewer.type === "image" ? <Maximize2 className="h-5 w-5" /> : <PlayCircle className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-white text-sm font-bold uppercase tracking-wider">{mediaViewer.type}</p>
            <p className="text-white/40 text-[10px]">{currentMediaIndex + 1} de {totalMedia} arquivos</p>
            {mediaViewer.metadata?.caption && (
              <p className="text-white/60 text-[10px] truncate max-w-[200px] italic mt-0.5">"{mediaViewer.metadata.caption}"</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-10 text-[10px] font-bold gap-2 text-white hover:bg-white/10"
            onClick={() => window.open(mediaViewer.url, '_blank')}
          >
            <ExternalLink className="h-3.5 w-3.5" /> ABRIR ORIGINAL
          </Button>
          <div className="w-px h-6 bg-white/10 mx-2" />
          <a 
            href={mediaViewer.url} 
            download 
            className="h-12 px-6 rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center gap-2 text-white text-sm font-bold shadow-xl border border-white/5"
          >
            <Download className="h-5 w-5" /> BAIXAR
          </a>
          <button 
            onClick={onClose}
            className="h-12 w-12 rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center text-white shadow-xl border border-white/5"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>
      
      <div className="relative group/gallery w-full h-full flex items-center justify-center">
        {/* Gallery Navigation */}
        {currentMediaIndex > 0 && (
          <button 
            onClick={() => onNavigate("prev")}
            className="absolute left-6 h-14 w-14 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all border border-white/10 group-hover/gallery:translate-x-0 -translate-x-4 opacity-0 group-hover/gallery:opacity-100"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}
        
        {currentMediaIndex < totalMedia - 1 && (
          <button 
            onClick={() => onNavigate("next")}
            className="absolute right-6 h-14 w-14 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all border border-white/10 group-hover/gallery:translate-x-0 translate-x-4 opacity-0 group-hover/gallery:opacity-100"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        )}

        <div className="max-w-[90vw] max-h-[75dvh] overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10 bg-black/40 flex items-center justify-center">
          {mediaViewer.type === "image" || mediaViewer.type === "sticker" ? (
            <div className="relative group/img">
              <img src={mediaViewer.url} alt="Full view" className="max-w-full max-h-full object-contain" onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://placehold.co/600x400?text=Erro+ao+carregar+imagem";
              }} />
              {mediaViewer.metadata?.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white text-center">
                  <p className="text-sm font-medium">{mediaViewer.metadata.caption}</p>
                </div>
              )}
            </div>
          ) : mediaViewer.type === "video" ? (
            <div className="relative bg-black/40 flex items-center justify-center min-h-[450px] w-full rounded-card border border-white/5 overflow-hidden shadow-2xl group">
              {(() => {
                const videoUrl = mediaViewer.url;
                const isWhatsAppDomain = videoUrl?.includes("mmg.whatsapp.net") || videoUrl?.includes("media.whatsapp.net");
                const hasValidUrl = videoUrl && !videoUrl.startsWith("[") && !videoUrl.includes(".enc") && !isWhatsAppDomain;
                
                if (!hasValidUrl) {
                  return (
                    <div className="flex flex-col items-center gap-6 p-12 text-center max-w-md animate-in fade-in zoom-in duration-300">
                      <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10 ring-4 ring-white/5">
                        <VideoOff className="h-10 w-10 text-white/30" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-white font-bold text-xl">Vídeo Protegido ou Expirado</p>
                        <p className="text-sm text-white/40 leading-relaxed">
                          O WhatsApp protege estas mídias com criptografia de ponta a ponta. Tente abrir o link original ou baixar o arquivo para o seu dispositivo.
                        </p>
                      </div>
                      <div className="flex flex-col w-full gap-3">
                        <Button className="w-full font-bold h-11 gap-2 shadow-lg" onClick={() => window.open(mediaViewer.url, '_blank')}>
                          <ExternalLink className="h-4 w-4" /> ABRIR ORIGINAL
                        </Button>
                        {mediaViewer.url && (
                          <Button variant="outline" className="w-full h-11 gap-2 border-white/10 hover:bg-white/5 text-white" asChild>
                            <a href={mediaViewer.url} download target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" /> BAIXAR VÍDEO
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <video 
                    src={videoUrl} 
                    controls 
                    autoPlay 
                    muted 
                    playsInline 
                    loop
                    className="max-w-full max-h-[75vh] rounded-lg" 
                    onLoadedMetadata={(e) => {
                      const video = e.target as HTMLVideoElement;
                      video.currentTime = 0.1;
                    }}
                    onError={() => {
                      toast.error("Erro ao carregar vídeo. O arquivo pode estar corrompido ou o link expirou.");
                    }}
                  />
                );
              })()}

              {mediaViewer.metadata?.caption && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-4 bg-black/80 border border-white/10 rounded-card shadow-2xl max-w-[85%] animate-in slide-in-from-bottom-4 duration-500">
                  <p className="text-white text-sm font-medium leading-relaxed italic text-center">
                    "{mediaViewer.metadata.caption}"
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-20 bg-secondary/20 flex flex-col items-center gap-6">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <File className="h-12 w-12" />
              </div>
              <div className="text-center">
                <p className="text-white text-xl font-bold">Arquivo de Documento</p>
                <p className="text-white/40 text-sm mt-1">Este formato não pode ser visualizado diretamente aqui.</p>
              </div>
              <Button className="font-bold px-8 gap-2" onClick={() => window.open(mediaViewer.url, '_blank')}>
                <ExternalLink className="h-4 w-4" /> VER NO NAVEGADOR
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
