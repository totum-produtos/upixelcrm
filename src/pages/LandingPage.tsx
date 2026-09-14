import { Link } from "react-router-dom";
import { ArrowRight, Bot, CheckCircle2, Kanban, MessageSquare, MousePointerClick, ShieldCheck, Sparkles, Target, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import upixelDark from "@/assets/upixel_dark.png";

declare global {
  interface Window {
    sendPrompt?: (msg: string) => void;
  }
}

function requestDemo() {
  const message = "Quero ver o uPixel CRM funcionando";
  if (typeof window !== "undefined" && typeof window.sendPrompt === "function") {
    window.sendPrompt(message);
    return;
  }
  window.location.href = "/cadastro";
}

const highlights = [
  { value: "2.490", label: "leads migrados" },
  { value: "11", label: "usuários ativos" },
  { value: "24h", label: "operação self-hosted" },
];

const features = [
  {
    title: "Inbox comercial",
    text: "WhatsApp, Instagram, Facebook e tarefas do time em um fluxo único de atendimento.",
    icon: MessageSquare,
  },
  {
    title: "Funil de vendas",
    text: "Leads organizados por etapa, responsáveis, origem e próxima ação.",
    icon: Kanban,
  },
  {
    title: "Automação com IA",
    text: "Bots, cadências, respostas rápidas e contexto para acelerar follow-up.",
    icon: Bot,
  },
  {
    title: "Metas e relatórios",
    text: "Dashboard, resumo de vendas, metas e indicadores para gestão diária.",
    icon: Target,
  },
];

const steps = [
  "Conecta canais e fontes de lead.",
  "Distribui conversas e tarefas para a equipe.",
  "Mede resultado por funil, meta e vendedor.",
];

export default function LandingPage() {
  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-3">
            <img src={upixelDark} alt="uPixel" className="h-9 w-auto dark:brightness-0 dark:invert" />
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#produto" className="hover:text-foreground">Produto</a>
            <a href="#operacao" className="hover:text-foreground">Operação</a>
            <a href="#planos" className="hover:text-foreground">Planos</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Entrar</Link>
            </Button>
            <Button size="sm" onClick={requestDemo} className="gap-2">
              Ver demo
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 md:px-6 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[0.95fr_1.05fr] lg:py-16">
        <div className="space-y-7">
          <div className="inline-flex rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
            CRM comercial para equipes que vendem por conversa
          </div>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-5xl font-bold leading-[0.95] tracking-tight md:text-6xl">
              Atendimento, funil e IA no mesmo painel.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">
              O uPixel organiza leads, conversas, metas e automações para a operação comercial vender com menos troca de contexto.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={requestDemo} className="gap-2">
              Solicitar demonstração
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">Acessar minha empresa</Link>
            </Button>
          </div>
          <div className="grid max-w-xl grid-cols-3 gap-3">
            {highlights.map((item) => (
              <div key={item.label} className="rounded-card border border-border bg-card p-4">
                <p className="text-2xl font-bold tabular-nums">{item.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-card border border-border bg-card p-4 shadow-card">
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Painel de hoje</p>
                <p className="text-xs text-muted-foreground">Resumo operacional do workspace</p>
              </div>
              <div className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">ao vivo</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Novos leads", "348", Users],
                ["Conversas abertas", "64", MessageSquare],
                ["Tarefas pendentes", "22", Zap],
                ["Metas ativas", "8", Target],
              ].map(([label, value, Icon]) => {
                const TypedIcon = Icon as typeof MessageSquare;
                return (
                  <div key={label as string} className="rounded-card border border-border bg-card p-4">
                    <TypedIcon className="mb-5 h-5 w-5 text-primary" />
                    <p className="text-2xl font-bold">{value as string}</p>
                    <p className="text-xs text-muted-foreground">{label as string}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 rounded-card border border-border p-4">
              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Funil de vendas</span>
                <span>R$ 181k previsto</span>
              </div>
              <div className="space-y-3">
                {["Novo", "Qualificado", "Proposta", "Fechado"].map((stage, index) => (
                  <div key={stage} className="grid grid-cols-[96px_1fr] items-center gap-3">
                    <span className="text-xs text-muted-foreground">{stage}</span>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${92 - index * 18}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="produto" className="border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-12 md:grid-cols-4 md:px-6">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-card border border-border bg-background p-5">
              <feature.icon className="mb-5 h-5 w-5 text-primary" />
              <h2 className="font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="operacao" className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Do primeiro contato ao fechamento.
          </h2>
          <p className="max-w-xl text-sm leading-7 text-muted-foreground">
            A operação inteira fica rastreável: origem do lead, dono da conversa, status da proposta, tarefa pendente e resultado.
          </p>
        </div>
        <div className="grid gap-3">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-4 rounded-card border border-border bg-card p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-primary text-sm font-bold text-primary-foreground">
                {index + 1}
              </div>
              <p className="text-sm font-medium">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
        <div className="rounded-card border border-border bg-card p-6 md:p-8">
          <div className="grid gap-8 md:grid-cols-[1fr_0.8fr] md:items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Sparkles className="h-4 w-4" />
                Implantação assistida
              </div>
              <h2 className="text-3xl font-bold tracking-tight">Coloque o CRM para rodar com dados reais.</h2>
              <p className="text-sm leading-7 text-muted-foreground">
                Importamos leads, configuramos canais e treinamos a equipe no fluxo de atendimento.
              </p>
            </div>
            <div className="space-y-3 rounded-card border border-border bg-background p-5">
              {["Setup do workspace", "Migração de leads", "Treinamento comercial", "Suporte de ativação"].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {item}
                </div>
              ))}
              <Button onClick={requestDemo} className="mt-3 w-full gap-2">
                Quero implantar
                <MousePointerClick className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6">
          <span>uPixel CRM</span>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Self-hosted na infraestrutura Totum
          </div>
        </div>
      </footer>
    </main>
  );
}
