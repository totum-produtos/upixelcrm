import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer,
} from "recharts";
import { Search, Download, Filter } from "lucide-react";

const leads = [
  { id: 1, nome: "Empresa ABC Ltda", contato: "Ana Silva", valor: 12500, status: "ganho", origem: "WhatsApp", data: "2026-09-10" },
  { id: 2, nome: "Tech Solutions SA", contato: "Pedro Costa", valor: 34000, status: "em-negociacao", origem: "Instagram", data: "2026-09-09" },
  { id: 3, nome: "Startup Nova Era", contato: "Maria Oliveira", valor: 8900, status: "qualificado", origem: "Site", data: "2026-09-08" },
  { id: 4, nome: "Corporativo Plus", contato: "Joao Santos", valor: 55000, status: "perdido", origem: "Google Ads", data: "2026-09-07" },
  { id: 5, nome: "Digital Mind", contato: "Lucia Ferreira", valor: 21000, status: "ganho", origem: "Indicacao", data: "2026-09-06" },
  { id: 6, nome: "Express Log", contato: "Carlos Melo", valor: 6700, status: "novo", origem: "Facebook", data: "2026-09-05" },
  { id: 7, nome: "Prime Construcoes", contato: "Rita Borges", valor: 89000, status: "em-negociacao", origem: "Google Ads", data: "2026-09-04" },
  { id: 8, nome: "Saude Total", contato: "Marcos Lima", valor: 15300, status: "qualificado", origem: "Site", data: "2026-09-03" },
];

const funnelData = [
  { name: "Novos Leads", value: 348, fill: "hsl(var(--primary))" },
  { name: "Qualificados", value: 210, fill: "#6366f1" },
  { name: "Em Negociacao", value: 98, fill: "#8b5cf6" },
  { name: "Propostas", value: 54, fill: "#a78bfa" },
  { name: "Ganhos", value: 23, fill: "#c4b5fd" },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  novo: { label: "Novo", variant: "outline" },
  qualificado: { label: "Qualificado", variant: "secondary" },
  "em-negociacao": { label: "Em Negociacao", variant: "default" },
  ganho: { label: "Ganho", variant: "default" },
  perdido: { label: "Perdido", variant: "destructive" },
};

export default function ReportsSalesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const filtered = leads.filter((l) => {
    const matchSearch = l.nome.toLowerCase().includes(search.toLowerCase()) || l.contato.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <AppLayout title="Resumo de Vendas">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Funil */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Funil de Conversao</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <FunnelChart>
                  <Tooltip
                    formatter={(value: number) => [value.toLocaleString("pt-BR"), "Leads"]}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      color: "hsl(var(--card-foreground))",
                    }}
                  />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    <LabelList position="inside" fill="white" stroke="none" fontSize={11} dataKey="name" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Summary stats */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Indicadores do Periodo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Total de Leads", value: "348", sub: "este mes" },
                  { label: "Taxa de Conversao", value: "23,7%", sub: "leads ganhos" },
                  { label: "Ticket Medio", value: "R$ 30.175", sub: "por negocio" },
                  { label: "Receita Prevista", value: "R$ 181k", sub: "pipeline ativo" },
                  { label: "Tempo Medio Fechamento", value: "14 dias", sub: "por deal" },
                  { label: "Leads Perdidos", value: "47", sub: "motivos registrados" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border p-4 space-y-1">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.sub}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leads Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-sm font-semibold">Leads do Periodo</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar lead..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 pl-8 w-48 text-sm"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-40 text-sm">
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="qualificado">Qualificado</SelectItem>
                    <SelectItem value="em-negociacao">Em Negociacao</SelectItem>
                    <SelectItem value="ganho">Ganho</SelectItem>
                    <SelectItem value="perdido">Perdido</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {["#", "Empresa", "Contato", "Valor", "Status", "Origem", "Data"].map((h) => (
                      <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead, i) => {
                    const sc = statusConfig[lead.status];
                    return (
                      <tr key={lead.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                        <td className="px-6 py-3 text-muted-foreground text-xs">{lead.id}</td>
                        <td className="px-6 py-3 font-medium">{lead.nome}</td>
                        <td className="px-6 py-3 text-muted-foreground">{lead.contato}</td>
                        <td className="px-6 py-3 font-semibold">R$ {lead.valor.toLocaleString("pt-BR")}</td>
                        <td className="px-6 py-3">
                          <Badge variant={sc.variant} className="text-xs">{sc.label}</Badge>
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">{lead.origem}</td>
                        <td className="px-6 py-3 text-muted-foreground text-xs">
                          {new Date(lead.data).toLocaleDateString("pt-BR")}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-sm text-muted-foreground">
                        Nenhum lead encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
