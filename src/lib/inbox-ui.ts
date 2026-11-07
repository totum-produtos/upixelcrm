// Constantes e utilitários puros de apresentação da Inbox (canais, iniciais, tempo relativo).
import { MessageCircle, Shield, Mail, Instagram, Globe } from "lucide-react";

export const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "bg-success",
  whatsapp_official: "bg-emerald-600",
  instagram: "bg-pink-500",
  email: "bg-primary",
  webchat: "bg-accent",
};

export const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  whatsapp_official: "WA Oficial",
  instagram: "Instagram",
  email: "E-mail",
  webchat: "Webchat",
};

export const CHANNEL_ICONS: Record<string, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  whatsapp_official: Shield,
  email: Mail,
  instagram: Instagram,
  webchat: Globe,
};

export const formatTime = (dateStr: string | null) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return "agora";
  if (diff < 3600000) return `há ${Math.floor(diff / 60000)}min`;
  if (diff < 86400000) return `há ${Math.floor(diff / 3600000)}h`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

export const initials = (name: string) =>
  name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
