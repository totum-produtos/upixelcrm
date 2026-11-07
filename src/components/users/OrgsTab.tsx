import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Search, Trash2, UserPlus, UserMinus, ChevronDown, ChevronUp } from "lucide-react";
import { roleBadge } from "./constants";
import type { OrgRow, ProfileRow } from "./types";

interface OrgsTabProps {
  loading: boolean;
  orgs: OrgRow[];
  orgSearch: string;
  onOrgSearchChange: (value: string) => void;
  expandedOrg: string | null;
  onToggleExpanded: (orgId: string) => void;
  onAddMember: (org: OrgRow) => void;
  onDeleteOrg: (org: OrgRow) => void;
  onRemoveMember: (member: ProfileRow, org: OrgRow) => void;
}

export function OrgsTab({
  loading, orgs, orgSearch, onOrgSearchChange, expandedOrg,
  onToggleExpanded, onAddMember, onDeleteOrg, onRemoveMember,
}: OrgsTabProps) {
  return (
    <div className="rounded-xl ghost-border bg-card">
      <div className="flex items-center justify-between ghost-border border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Todas as empresas</h2>
          <p className="text-xs text-muted-foreground">Gerencie organizações e seus membros</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar empresa..." className="pl-8 h-9 text-xs" value={orgSearch} onChange={(e) => onOrgSearchChange(e.target.value)} />
        </div>
      </div>
      {loading ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
      ) : (
        <div className="divide-y divide-border">
          {orgs.map((o) => (
            <div key={o.id} className="px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent-foreground">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{o.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Dono: {o.owner_name} · {o.member_count} membro{o.member_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => onToggleExpanded(o.id)}>
                    {expandedOrg === o.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    Membros
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-xs text-primary" onClick={() => onAddMember(o)}>
                    <UserPlus className="h-3 w-3" /> Adicionar
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-1 text-xs" onClick={() => onDeleteOrg(o)}>
                    <Trash2 className="h-3 w-3" /> Excluir
                  </Button>
                </div>
              </div>

              {expandedOrg === o.id && (
                <div className="mt-3 ml-13 space-y-1.5 pl-4 border-l-2 border-border">
                  {(o.members || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">Nenhum membro nesta empresa.</p>
                  ) : (
                    (o.members || []).map((m) => (
                      <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                            {m.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                              {m.name}
                              {m.id === o.owner_id && <Badge variant="outline" className="text-[9px] px-1 py-0 border-[hsl(var(--border-strong))] text-primary">Dono</Badge>}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{m.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] ${roleBadge(m.role)}`}>{m.role}</Badge>
                          {m.id !== o.owner_id && (
                            <Button variant="ghost" size="sm" className="h-7 gap-1 text-[10px] text-destructive hover:text-destructive" onClick={() => onRemoveMember(m, o)}>
                              <UserMinus className="h-3 w-3" /> Remover
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
          {orgs.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma empresa encontrada.</p>}
        </div>
      )}
    </div>
  );
}
