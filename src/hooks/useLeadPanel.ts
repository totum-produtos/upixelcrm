import { useState, useEffect } from "react";

// Estado de abertura do painel do lead na Inbox: no desktop persiste em localStorage,
// no mobile abre como overlay sob demanda (não persiste).
export function useLeadPanel(isMobile: boolean) {
  const [showSidebar, setShowSidebar] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem("upixel.inbox.showSidebar");
    return saved === null ? true : saved === "1";
  });

  // Persiste preferência do painel lateral para não voltar todo reload.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("upixel.inbox.showSidebar", showSidebar ? "1" : "0");
  }, [showSidebar]);

  // Painel do lead no mobile abre como overlay sob demanda (não persiste como o desktop).
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  // Estado unificado de abertura do painel do lead (desktop persiste; mobile é overlay).
  const panelOpen = isMobile ? mobilePanelOpen : showSidebar;
  const setPanelOpen = (open: boolean) => {
    if (isMobile) setMobilePanelOpen(open);
    else setShowSidebar(open);
  };
  const togglePanel = () => setPanelOpen(!panelOpen);

  return { panelOpen, setPanelOpen, togglePanel };
}
