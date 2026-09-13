import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ShieldCheck, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Role {
  id: number;
  nome: string;
  slug: string;
  descricao: string;
  usuarios: number;
  permissoes: string[];
}

const mockRoles: Role[] = [
  {
    id: 1,
    nome: "Master",
    slug: "master",
    descricao: "Acesso total ao sistema, sem restricoes.",
    usuarios: 2,
    permissoes: ["todos os modulos", "usuarios", "configuracoes", "faturamento", "relatorios", "integracoes"],
  },
  {
    id: 2,
    nome: "Supervisor",
    slug: "supervisor",
    descricao: "Gerencia equipes e tem acesso a relatorios e configuracoes.",
    usuarios: 5,
    permissoes: ["dashboard", "leads", "relatorios", "usuarios", "automacoes", "tarefas"],
  },
  {
    id: 3,
    nome: "Vendedor",
    slug: "vendedor",
    descricao: "Acesso ao CRM, inbox, leads e tarefas proprias.",
    usuarios: 18,
    permissoes: ["dashboard", "inbox", "leads", "tarefas", "contatos"],
  },
  {
    id: 4,
    nome: "Atendente",
    slug: "atendente",
    descricao: "Atende conversas e registra interacoes com clientes.",
    usuarios: 12,
    permissoes: ["inbox", "contatos", "tarefas"],
  },
];

const permColorMap: Record<string, string> = {
  "todos os modulos": "bg-primary/10 text-primary border-primary/20",
  usuarios: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  configuracoes: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  faturamento: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  relatorios: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  integracoes: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  dashboard: "bg-muted text-muted-foreground border-border",
  leads: "bg-muted text-muted-foreground border-border",
  automacoes: "bg-muted text-muted-foreground border-border",
  tarefas: "bg-muted text-muted-foreground border-border",
  inbox: "bg-muted text-muted-foreground border-border",
  contatos: "bg-muted text-muted-foreground border-border",
};

export default function RolesPage() {
  const [roles] = useState<Role[]>(mockRoles);

  return (
    <AppLayout title="Papeis e Permissoes">
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Papeis</h2>
            <p className="text-sm text-muted-foreground">{roles.length} papeis configurados</p>
          </div>
          <Button size="sm" className="gap-1.5 text-xs h-8">
            <Plus className="h-3.5 w-3.5" />
            Novo Papel
          </Button>
        </div>

        <div className="space-y-3">
          {roles.map((role) => (
            <Card key={role.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{role.nome}</span>
                        <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">{role.slug}</code>
                        <span className="text-xs text-muted-foreground">{role.usuarios} usuario{role.usuarios !== 1 ? "s" : ""}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{role.descricao}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {role.permissoes.map((perm) => (
                          <span
                            key={perm}
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${permColorMap[perm] ?? "bg-muted text-muted-foreground border-border"}`}
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2 text-xs">
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-xs text-destructive focus:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
