import { useState, useMemo } from "react";
import type { Message } from "@/hooks/useInbox";

export interface MediaViewerItem {
  url: string;
  type: string;
  id?: string;
  metadata?: Message["metadata"];
}

// Estado do visualizador de mídia (lightbox) da Inbox, com navegação pela galeria
// de mídias da conversa aberta.
export function useMediaViewer(messages: Message[]) {
  const [mediaViewer, setMediaViewer] = useState<MediaViewerItem | null>(null);

  // Navegação da galeria do visualizador de mídia
  const allMedia = useMemo(() =>
    messages.filter(m => ["image", "video", "sticker", "file", "document"].includes(m.type)),
    [messages]
  );

  const currentMediaIndex = useMemo(() =>
    mediaViewer ? allMedia.findIndex(m => m.id === mediaViewer.id) : -1,
    [mediaViewer, allMedia]
  );

  const navigateMedia = (dir: "prev" | "next") => {
    if (currentMediaIndex === -1) return;
    const nextIdx = dir === "next" ? currentMediaIndex + 1 : currentMediaIndex - 1;
    if (nextIdx >= 0 && nextIdx < allMedia.length) {
      const m = allMedia[nextIdx];
      setMediaViewer({ url: m.content, type: m.type, id: m.id, metadata: m.metadata });
    }
  };

  return { mediaViewer, setMediaViewer, allMedia, currentMediaIndex, navigateMedia };
}
