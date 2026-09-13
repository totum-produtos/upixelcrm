import { logger } from "@/lib/logger";
import { Brain, Sparkles, Send, Lightbulb, MessageSquare, TrendingUp, HelpCircle, BookOpen, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useRef, useEffect } from "react";
import * as alexandriaRepo from "@/services/alexandria";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
  ragDocs?: { id: string; title: string; type: string; similarity: number }[];
}

const quickSuggestions = [
  { icon: MessageSquare, label: "Sugerir resposta para objeção de preço", category: "Comercial" },
  { icon: TrendingUp, label: "Como melhorar taxa de conversão?", category: "Estratégia" },
  { icon: HelpCircle, label: "Como configurar automações no pipeline?", category: "Sistema" },
  { icon: Lightbulb, label: "Dicas para follow-up eficiente", category: "Comercial" },
];

const systemTips = [
  "Use tags para segmentar leads e disparar automações automáticas.",
  "Configure cadências de tarefas nas colunas do pipeline para nunca perder um follow-up.",
  "Importe leads via CSV e defina o pipeline/etapa inicial automaticamente.",
];

export function AssistantTab() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Olá! Sou o assistente uPixel com RAG integrado. Posso ajudar com sugestões de resposta, orientações sobre o sistema ou estratégias de vendas. Minhas respostas são enriquecidas com a base de conhecimento quando disponível. Como posso ajudar?",
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  const handleSend = async () => {
    const text = query.trim();
    if (!text || isProcessing) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setIsProcessing(true);

    try {
      const history = [...messages.slice(1), userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await alexandriaRepo.invokeAiChat(history);

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          ragDocs: data.rag?.used ? data.rag.documents : undefined,
        },
      ]);
    } catch (err) {
      logger.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.",
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-240px)] min-h-[540px] overflow-hidden rounded-xl border bg-background shadow-sm">

      {/* Left sidebar — sugestões e dicas */}
      <div className="w-72 shrink-0 border-r flex flex-col">
        {/* Header */}
        <div className="px-4 py-4 border-b">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Assistente IA</p>
              <p className="text-[11px] text-muted-foreground leading-tight">uPixel + RAG</p>
            </div>
          </div>
        </div>

        {/* Suggestions + Tips */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {/* Quick suggestions */}
          <div>
            <div className="flex items-center gap-1.5 px-1 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sugestões</span>
            </div>
            <div className="space-y-1">
              {quickSuggestions.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setQuery(s.label)}
                  className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-accent/50 transition-colors text-left group"
                >
                  <s.icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0 group-hover:text-primary transition-colors" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug">{s.label}</p>
                    <Badge variant="secondary" className="mt-0.5 text-[9px] px-1 py-0 h-4">{s.category}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* System tips */}
          <div>
            <div className="flex items-center gap-1.5 px-1 mb-2">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dicas</span>
            </div>
            <div className="space-y-2">
              {systemTips.map((tip, i) => (
                <div key={i} className="flex gap-2 px-2.5 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">{i + 1}</span>
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-snug">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main chat thread */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="border-b px-5 py-3 flex items-center gap-2 shrink-0">
          <Brain className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Conversa com IA</span>
          <Badge variant="secondary" className="text-[10px] ml-auto">RAG ativo</Badge>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Brain className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`rounded-2xl px-4 py-3 max-w-[75%] ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-secondary text-foreground rounded-bl-sm"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                {msg.ragDocs && msg.ragDocs.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/20 text-xs opacity-80">
                    <BookOpen className="h-3 w-3 shrink-0" />
                    <span>{msg.ragDocs.length} doc(s) RAG: {msg.ragDocs.map((d) => d.title).join(", ")}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-secondary rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Buscando contexto e gerando resposta…</p>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="border-t px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
              placeholder="Pergunte algo…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              disabled={isProcessing}
            />
            <Button
              size="icon"
              className="h-9 w-9 rounded-xl shrink-0"
              disabled={!query.trim() || isProcessing}
              onClick={handleSend}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 px-1">Enter para enviar · RAG consulta a base de conhecimento automaticamente</p>
        </div>
      </div>

    </div>
  );
}
