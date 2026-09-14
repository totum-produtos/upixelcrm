import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, CheckSquare, Clock, Kanban, MessageSquare, Target, TrendingUp, Users, Zap } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { LeadsByOriginChart, LeadsByPeriodChart } from "@/components/dashboard/DashboardCharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardKpis } from "@/hooks/useDashboardKpis";
import { useAppState } from "@/contexts/AppContext";
import { formatRelativeTime } from "@/lib/format-date";

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}

export default function DashboardGeneralPage() {
  const { data, isLoading, error, refetch } = useDashboardKpis();
  const { tasks } = useAppState();

  const stats = data?.stats;
  const pendingTasks = tasks.filter((task) => task.status !== "completed").slice(0, 5);
  const recentActivity = data?.recent_activity ?? [];
  const pipeline = data?.pipeline ?? [];

  const cards = [
    {
      label: "Leads totais",
      value: formatNumber(stats?.total_leads ?? 0),
      description: `${formatNumber(stats?.leads_30d ?? 0)} novos em 30 dias`,
      icon: Users,
    },
    {
      label: "Em andamento",
      value: formatNumber(stats?.in_progress ?? 0),
      description: `${formatNumber(stats?.new_leads ?? 0)} entradas novas`,
      icon: Kanban,
    },
    {
      label: "Ganhos",
      value: formatNumber(stats?.won ?? 0),
      description: "Conversões confirmadas",
      icon: TrendingUp,
    },
    {
      label: "Tarefas abertas",
      value: formatNumber(pendingTasks.length),
      description: "Prioridade operacional",
      icon: CheckSquare,
    },
  ];

  if (error) {
    return (
      <AppLayout title="Dashboard geral" subtitle="Visão executiva do uPixel">
        <div className="p-6">
          <Card className="mx-auto max-w-xl border-destructive/30">
            <CardHeader>
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <CardTitle className="text-base text-destructive">Não foi possível carregar o dashboard</CardTitle>
                  <CardDescription className="mt-1">
                    {error instanceof Error ? error.message : "Erro desconhecido. Tente novamente em instantes."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button onClick={() => refetch()} size="sm">Tentar novamente</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Dashboard geral"
      subtitle="Leads, tarefas e operação comercial em uma tela"
      actions={
        <Button asChild size="sm" variant="outline" className="gap-2">
          <Link to="/reports">
            Resumo de vendas
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      }
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading && !data
            ? Array.from({ length: 4 }).map((_, index) => (
                <Card key={index}>
                  <CardHeader className="space-y-3">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-8 w-20" />
                  </CardHeader>
                </Card>
              ))
            : cards.map((card) => (
                <Card key={card.label} className="overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                        <p className="text-3xl font-bold tracking-tight tabular-nums">{card.value}</p>
                        <p className="text-xs text-muted-foreground">{card.description}</p>
                      </div>
                      <div className="rounded-card border border-border bg-muted p-2.5">
                        <card.icon className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">Movimento de leads</CardTitle>
                <CardDescription>Entradas por período e origem</CardDescription>
              </div>
              <Badge variant="outline">Tempo real</Badge>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-2">
              <LeadsByPeriodChart data={data?.leads_by_month ?? []} />
              <LeadsByOriginChart data={data?.leads_by_origin ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funil rápido</CardTitle>
              <CardDescription>Distribuição atual das oportunidades</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pipeline.length === 0 ? (
                <p className="rounded-card border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Nenhuma etapa com dados no momento.
                </p>
              ) : (
                pipeline.slice(0, 6).map((stage) => (
                  <div key={stage.stage} className="space-y-2">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="font-medium">{stage.stage}</span>
                      <span className="text-muted-foreground">{formatNumber(stage.count)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${Math.min(100, Math.max(8, stage.count * 8))}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Atividade recente</CardTitle>
              <CardDescription>Últimos eventos registrados no CRM</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.length === 0 ? (
                <p className="rounded-card border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Sem atividade recente para exibir.
                </p>
              ) : (
                recentActivity.slice(0, 6).map((activity, index) => (
                  <div key={`${activity.type}-${activity.lead_id ?? index}`} className="flex items-center gap-3 rounded-card border border-border p-3">
                    <div className="rounded-card bg-muted p-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(activity.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Próximas ações</CardTitle>
              <CardDescription>Tarefas abertas da operação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingTasks.length === 0 ? (
                <p className="rounded-card border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Nenhuma tarefa aberta.
                </p>
              ) : (
                pendingTasks.map((task) => (
                  <Link key={task.id} to="/tasks" className="block rounded-card border border-border p-3 transition-colors hover:bg-muted/50">
                    <div className="flex items-start gap-3">
                      <div className="rounded-card bg-muted p-2">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{task.type || "Tarefa"}</p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            { title: "Metas", text: "Acompanhar objetivos e calendário.", icon: Target, to: "/metas" },
            { title: "Automação", text: "Revisar fluxos e execuções recentes.", icon: Zap, to: "/automations" },
            { title: "Inbox", text: "Responder conversas pendentes.", icon: MessageSquare, to: "/inbox" },
          ].map((item) => (
            <Link key={item.title} to={item.to} className="rounded-card border border-border bg-card p-5 transition-colors hover:bg-muted/40">
              <item.icon className="mb-4 h-5 w-5 text-primary" />
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
            </Link>
          ))}
        </section>
      </div>
    </AppLayout>
  );
}
