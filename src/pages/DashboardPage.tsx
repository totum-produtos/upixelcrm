import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useDashboardKpis } from "@/hooks/useDashboardKpis";
import {
  TrendingUp, TrendingDown, Users, CheckSquare, Clock, Activity,
  Loader2, ArrowUpRight, ArrowDownRight, AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LeadsByPeriodChart, LeadsByOriginChart } from "@/components/dashboard/DashboardCharts";
import { formatRelativeTime, formatShortDate } from "@/lib/format-date";
import { useAppState } from "@/contexts/AppContext";
import { CompleteTaskDialog } from "@/components/crm/CompleteTaskDialog";
import type { Task } from "@/types";

const typeColors: Record<string, string> = {
  stage_change: "bg-primary",
  action: "bg-accent",
  task: "bg-success",
  automation: "bg-warning",
};

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboardKpis();
  const { tasks, completeTask } = useAppState();
  const [completingTask, setCompletingTask] = useState<Task | null>(null);

  const stats = data?.stats;
  const pipeline = useMemo(() => data?.pipeline ?? [], [data?.pipeline]);
  const leadsByMonth = data?.leads_by_month ?? [];
  const leadsByOrigin = data?.leads_by_origin ?? [];
  const recentActivity = data?.recent_activity ?? [];
  const pendingTasks = data?.pending_tasks ?? [];

  const totalLeads = stats?.total_leads ?? 0;
  const pipelineTotal = useMemo(() => pipeline.reduce((s, p) => s + p.count, 0), [pipeline]);

  const overviewCards = useMemo(() => [
    {
      label: "Total de Leads",
      value: totalLeads,
      description: "Base ativa",
      change: stats?.leads_30d ?? 0,
      changeLabel: "novos nos últimos 30d",
      up: (stats?.leads_30d ?? 0) >= 0,
      icon: Users,
    },
    {
      label: "Em Andamento",
      value: stats?.in_progress ?? 0,
      description: "Leads em progresso",
      change: stats?.new_leads ?? 0,
      changeLabel: "entradas novas",
      up: true,
      icon: Loader2,
    },
    {
      label: "Leads Ganhos",
      value: stats?.won ?? 0,
      description: "Conversões confirmadas",
      change: totalLeads > 0 ? Math.round(((stats?.won ?? 0) / totalLeads) * 100) : 0,
      changeLabel: "% conversão",
      up: true,
      icon: TrendingUp,
    },
    {
      label: "Leads Perdidos",
      value: stats?.lost ?? 0,
      description: "Oportunidades encerradas",
      change: totalLeads > 0 ? Math.round(((stats?.lost ?? 0) / totalLeads) * 100) : 0,
      changeLabel: "% perda",
      up: false,
      icon: TrendingDown,
    },
  ], [stats, totalLeads]);

  function openCompleteTask(taskId: string) {
    const fullTask = tasks.find((t) => t.id === taskId);
    if (fullTask) setCompletingTask(fullTask);
  }

  async function handleConfirmCompleteDashboardTask(id: string, result?: string) {
    const ok = await completeTask(id, result);
    if (ok) refetch();
    return ok;
  }

  if (error) {
    return (
      <AppLayout title="Dashboard" subtitle="Visão geral da operação">
        <div className="p-8">
          <Card className="max-w-xl mx-auto border-destructive/30">
            <CardHeader>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <CardTitle className="text-destructive text-base">Não foi possível carregar o dashboard</CardTitle>
                  <CardDescription className="mt-1">
                    {error instanceof Error ? error.message : "Erro desconhecido. Tente novamente em instantes."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => refetch()} size="sm">Tentar novamente</Button>
            </CardFooter>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (isLoading && !data) {
    return (
      <AppLayout title="Dashboard" subtitle="Visão geral da operação">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-16 mt-1" />
                </CardHeader>
                <CardFooter><Skeleton className="h-3 w-28" /></CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard" subtitle="Visão geral da operação">
      <div className="p-6 space-y-6 animate-fade-in">

        {/* Overview KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {overviewCards.map((card) => (
            <Card key={card.label} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>{card.label}</CardDescription>
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <card.icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold tabular-nums">{card.value.toLocaleString('pt-BR')}</CardTitle>
              </CardHeader>
              <CardFooter className="pt-0 flex items-center gap-1.5">
                <Badge variant="outline" className={`gap-1 text-xs ${card.up ? "text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400" : "text-muted-foreground"}`}>
                  {card.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {card.change}
                </Badge>
                <span className="text-xs text-muted-foreground">{card.changeLabel}</span>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LeadsByPeriodChart data={leadsByMonth} />
          <LeadsByOriginChart data={leadsByOrigin} />
        </div>

        {/* Operational Row: Pipeline + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Pipeline Summary */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Pipeline de Vendas</CardTitle>
              <CardDescription>{pipelineTotal} leads no pipeline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pipeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma coluna com leads ainda.</p>
              ) : (
                pipeline.map((col) => {
                  const pct = pipelineTotal > 0 ? Math.round((col.count / pipelineTotal) * 100) : 0;
                  return (
                    <div key={col.column_id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color || "hsl(var(--primary))" }} />
                          <span className="text-sm font-medium truncate max-w-[160px]">{col.name}</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-semibold tabular-nums">{col.count}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
                        </div>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Atividades Recentes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
              ) : recentActivity.map((a, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${typeColors[a.type] || "bg-primary"}`} />
                    {i < recentActivity.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="pb-3 min-w-0">
                    <p className="text-sm text-foreground line-clamp-2">{a.content}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3 shrink-0" /> {formatRelativeTime(a.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Pending Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Tarefas Pendentes</CardTitle>
                <CardDescription>{stats?.tasks_pending ?? 0} pendentes · {stats?.tasks_overdue ?? 0} atrasadas</CardDescription>
              </div>
              <CheckSquare className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {pendingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem tarefas pendentes.</p>
            ) : (
              <ul className="space-y-2">
                {pendingTasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between rounded-lg border px-3 py-2.5 hover:bg-accent/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <Checkbox
                        className="h-4 w-4 shrink-0"
                        checked={false}
                        onCheckedChange={() => openCompleteTask(task.id)}
                      />
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-foreground truncate block">{task.title}</span>
                        {task.lead_name && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {task.lead_name}{task.lead_company ? ` · ${task.lead_company}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {task.status === "overdue" && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Atrasada</Badge>
                      )}
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">{formatShortDate(task.due_date)}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

      </div>

      <CompleteTaskDialog
        task={completingTask}
        open={!!completingTask}
        onOpenChange={(open) => { if (!open) setCompletingTask(null); }}
        onConfirm={handleConfirmCompleteDashboardTask}
      />
    </AppLayout>
  );
}
