import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  DollarSign, Users, TrendingUp, CheckSquare,
  ArrowUpRight, ArrowDownRight, MessageSquare, Kanban, Zap, Target,
} from "lucide-react";

const salesData = [
  { mes: "Jan", vendas: 42000 },
  { mes: "Fev", vendas: 51000 },
  { mes: "Mar", vendas: 38000 },
  { mes: "Abr", vendas: 67000 },
  { mes: "Mai", vendas: 74000 },
  { mes: "Jun", vendas: 61000 },
  { mes: "Jul", vendas: 89000 },
  { mes: "Ago", vendas: 95000 },
  { mes: "Set", vendas: 82000 },
];

const kpis = [
  {
    label: "Receita Total",
    value: "R$ 95.400",
    change: "+12,5%",
    up: true,
    desc: "vs. mes anterior",
    icon: DollarSign,
    color: "text-emerald-500",
  },
  {
    label: "Novos Leads",
    value: "348",
    change: "+8,2%",
    up: true,
    desc: "este mes",
    icon: Users,
    color: "text-blue-500",
  },
  {
    label: "Taxa de Conversao",
    value: "23,7%",
    change: "-1,4%",
    up: false,
    desc: "leads qualificados",
    icon: TrendingUp,
    color: "text-violet-500",
  },
  {
    label: "Tarefas Concluidas",
    value: "127",
    change: "+21%",
    up: true,
    desc: "dos 153 pendentes",
    icon: CheckSquare,
    color: "text-amber-500",
  },
];

const recentActivity = [
  { id: 1, type: "lead", action: "Novo lead criado", name: "Empresa ABC Ltda", time: "2 min", status: "novo" },
  { id: 2, type: "task", action: "Tarefa concluida", name: "Follow-up Empresa XYZ", time: "15 min", status: "concluida" },
  { id: 3, type: "deal", action: "Negocio ganho", name: "Contrato Tech Solutions", time: "1h", status: "ganho" },
  { id: 4, type: "message", action: "Mensagem recebida", name: "Carlos Silva — WhatsApp", time: "2h", status: "pendente" },
  { id: 5, type: "lead", action: "Lead atualizado", name: "Startup Nova Era", time: "3h", status: "em-progresso" },
  { id: 6, type: "automation", action: "Automacao disparada", name: "Sequencia pos-cadastro", time: "4h", status: "ativo" },
  { id: 7, type: "deal", action: "Negocio perdido", name: "Proposta Corporativa S/A", time: "6h", status: "perdido" },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  novo: { label: "Novo", variant: "default" },
  concluida: { label: "Concluida", variant: "secondary" },
  ganho: { label: "Ganho", variant: "default" },
  pendente: { label: "Pendente", variant: "outline" },
  "em-progresso": { label: "Em Progresso", variant: "secondary" },
  ativo: { label: "Ativo", variant: "default" },
  perdido: { label: "Perdido", variant: "destructive" },
};

const typeIcon: Record<string, typeof MessageSquare> = {
  lead: Users,
  task: CheckSquare,
  deal: Kanban,
  message: MessageSquare,
  automation: Zap,
};

function formatCurrency(n: number) {
  return `R$ ${(n / 1000).toFixed(0)}k`;
}

export default function DashboardGeneralPage() {
  return (
    <AppLayout title="Dashboard">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.label} className="relative overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
                      <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                      <div className="flex items-center gap-1">
                        {kpi.up ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                        )}
                        <span className={`text-xs font-semibold ${kpi.up ? "text-emerald-500" : "text-red-500"}`}>
                          {kpi.change}
                        </span>
                        <span className="text-xs text-muted-foreground">{kpi.desc}</span>
                      </div>
                    </div>
                    <div className={`rounded-lg p-2.5 bg-muted/50 ${kpi.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Line Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Vendas por Mes</CardTitle>
              <CardDescription className="text-xs">Receita acumulada em 2026</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={salesData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tickFormatter={formatCurrency}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, "Vendas"]}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      color: "hsl(var(--card-foreground))",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="vendas"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quick stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Resumo do Mes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Leads Abertos", value: "84", icon: Users, color: "text-blue-500" },
                { label: "Metas Ativas", value: "6", icon: Target, color: "text-violet-500" },
                { label: "Negociacoes Ativas", value: "31", icon: Kanban, color: "text-amber-500" },
                { label: "Automacoes Ativas", value: "12", icon: Zap, color: "text-emerald-500" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${item.color}`} />
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="text-sm font-semibold">{item.value}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Atividades Recentes</CardTitle>
            <CardDescription className="text-xs">Ultimas interacoes no sistema</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acao</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detalhe</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tempo</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((row, i) => {
                    const Icon = typeIcon[row.type] ?? MessageSquare;
                    const sc = statusConfig[row.status];
                    return (
                      <tr key={row.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                        <td className="px-6 py-3">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </td>
                        <td className="px-6 py-3 font-medium">{row.action}</td>
                        <td className="px-6 py-3 text-muted-foreground">{row.name}</td>
                        <td className="px-6 py-3 text-muted-foreground text-xs">{row.time} atras</td>
                        <td className="px-6 py-3">
                          <Badge variant={sc.variant} className="text-xs">{sc.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
