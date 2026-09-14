import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, MoreHorizontal, Eye, Download, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type InvoiceStatus = "pago" | "pendente" | "vencido" | "rascunho";

interface Invoice {
  id: number;
  numero: string;
  cliente: string;
  valor: number;
  status: InvoiceStatus;
  data: string;
  vencimento: string;
}

const mockInvoices: Invoice[] = [
  { id: 1, numero: "INV-001", cliente: "Empresa ABC Ltda", valor: 12500, status: "pago", data: "2026-09-01", vencimento: "2026-09-15" },
  { id: 2, numero: "INV-002", cliente: "Tech Solutions SA", valor: 34000, status: "pendente", data: "2026-09-05", vencimento: "2026-09-20" },
  { id: 3, numero: "INV-003", cliente: "Startup Nova Era", valor: 8900, status: "vencido", data: "2026-08-15", vencimento: "2026-08-30" },
  { id: 4, numero: "INV-004", cliente: "Corporativo Plus", valor: 55000, status: "pago", data: "2026-09-08", vencimento: "2026-09-22" },
  { id: 5, numero: "INV-005", cliente: "Digital Mind", valor: 21000, status: "rascunho", data: "2026-09-10", vencimento: "2026-09-24" },
  { id: 6, numero: "INV-006", cliente: "Express Log", valor: 6700, status: "pendente", data: "2026-09-11", vencimento: "2026-09-25" },
  { id: 7, numero: "INV-007", cliente: "Prime Construcoes", valor: 89000, status: "pago", data: "2026-09-03", vencimento: "2026-09-17" },
];

const statusConfig: Record<InvoiceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pago: { label: "Pago", variant: "default" },
  pendente: { label: "Pendente", variant: "secondary" },
  vencido: { label: "Vencido", variant: "destructive" },
  rascunho: { label: "Rascunho", variant: "outline" },
};

export default function InvoicePage() {
  const [search, setSearch] = useState("");

  const filtered = mockInvoices.filter((inv) =>
    inv.numero.toLowerCase().includes(search.toLowerCase()) ||
    inv.cliente.toLowerCase().includes(search.toLowerCase())
  );

  const totalPago = mockInvoices.filter((i) => i.status === "pago").reduce((s, i) => s + i.valor, 0);
  const totalPendente = mockInvoices.filter((i) => i.status === "pendente").reduce((s, i) => s + i.valor, 0);
  const totalVencido = mockInvoices.filter((i) => i.status === "vencido").reduce((s, i) => s + i.valor, 0);

  return (
    <AppLayout
      title="Faturas"
      subtitle="Cobranças, vencimentos e histórico financeiro do workspace"
      actions={
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nova fatura
        </Button>
      }
    >
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Pago", value: totalPago, color: "text-emerald-500" },
            { label: "Aguardando Pagamento", value: totalPendente, color: "text-amber-500" },
            { label: "Vencido", value: totalVencido, color: "text-red-500" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>
                  R$ {s.value.toLocaleString("pt-BR")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-sm font-semibold">Todas as Faturas</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar fatura..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 pl-8 w-48 text-sm"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {["#", "Cliente", "Valor", "Status", "Emissao", "Vencimento", "Acoes"].map((h) => (
                      <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv, i) => {
                    const sc = statusConfig[inv.status];
                    return (
                      <tr key={inv.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                        <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{inv.numero}</td>
                        <td className="px-6 py-3 font-medium">{inv.cliente}</td>
                        <td className="px-6 py-3 font-semibold">R$ {inv.valor.toLocaleString("pt-BR")}</td>
                        <td className="px-6 py-3">
                          <Badge variant={sc.variant} className="text-xs">{sc.label}</Badge>
                        </td>
                        <td className="px-6 py-3 text-muted-foreground text-xs">
                          {new Date(inv.data).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-6 py-3 text-muted-foreground text-xs">
                          {new Date(inv.vencimento).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-6 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="gap-2 text-xs">
                                <Eye className="h-3.5 w-3.5" /> Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 text-xs">
                                <Download className="h-3.5 w-3.5" /> Baixar PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 text-xs text-destructive focus:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-sm text-muted-foreground">
                        Nenhuma fatura encontrada.
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
