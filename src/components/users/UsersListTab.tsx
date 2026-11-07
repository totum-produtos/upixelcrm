import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2, Shield, Mail, Search, Ban, CheckCircle2, PencilLine, Trash2, Plus,
} from "lucide-react";
import type { AuthUser } from "@/contexts/AuthContext";
import { roleBadge } from "./constants";
import type { ProfileRow } from "./types";

interface UsersListTabProps {
  loading: boolean;
  profiles: ProfileRow[];
  search: string;
  onSearchChange: (value: string) => void;
  isMaster: boolean;
  user: AuthUser | null;
  onCreateUser: () => void;
  onApprove: (profile: ProfileRow) => void;
  onEditRole: (profile: ProfileRow) => void;
  onToggleBlock: (profile: ProfileRow) => void;
  onDelete: (profile: ProfileRow) => void;
}

export function UsersListTab({
  loading, profiles, search, onSearchChange, isMaster, user,
  onCreateUser, onApprove, onEditRole, onToggleBlock, onDelete,
}: UsersListTabProps) {
  return (
    <div className="rounded-xl ghost-border bg-card">
      <div className="flex items-center justify-between ghost-border border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Lista de Usuários</h2>
          <p className="text-xs text-muted-foreground">Visão geral dos colaboradores e suas permissões</p>
        </div>
        <div className="flex items-center gap-2">
          {isMaster && (
            <Button
              size="sm"
              className="gap-1 text-xs bg-green-600 hover:bg-green-700"
              onClick={onCreateUser}
            >
              <Plus className="h-3 w-3" /> Novo Usuário
            </Button>
          )}
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar usuário..." className="pl-8 h-9 text-xs" value={search} onChange={(e) => onSearchChange(e.target.value)} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
      ) : (
        <div className="divide-y divide-border">
          {profiles.map((p) => (
            <div key={p.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold ${p.is_blocked ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
                  {p.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    {p.name}
                    {p.is_blocked && <Badge variant="destructive" className="text-[9px] px-1.5 py-0">Bloqueado</Badge>}
                    {p.approval_status === "pending" && <Badge className="text-[9px] px-1.5 py-0 bg-yellow-500/15 text-yellow-600 border-yellow-500/30">Pendente</Badge>}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {p.email || "—"}</p>
                  {isMaster && p.org_name && <p className="flex items-center gap-1 text-[10px] text-muted-foreground"><Building2 className="h-2.5 w-2.5" /> {p.org_name}</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={roleBadge(p.role)}><Shield className="mr-1 h-3 w-3" /> {p.role}</Badge>
                {(isMaster || user?.role === "supervisor") && (
                    <>
                        {isMaster && p.approval_status === "pending" && p.id !== user?.id && (
                          <Button variant="default" size="sm" className="gap-1 text-xs bg-green-600 hover:bg-green-700" onClick={() => onApprove(p)}>
                            <CheckCircle2 className="h-3 w-3" /> Aprovar
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => onEditRole(p)}>
                        <PencilLine className="h-3 w-3" /> Mudar Permissão
                        </Button>
                        {p.id !== user?.id && (
                            <>
                                <Button variant={p.is_blocked ? "default" : "destructive"} size="sm" className="gap-1 text-xs" onClick={() => onToggleBlock(p)}>
                                {p.is_blocked ? <CheckCircle2 className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                                {p.is_blocked ? "Desbloquear" : "Bloquear"}
                                </Button>
                                {isMaster && (
                                  <Button variant="destructive" size="sm" className="gap-1 text-xs" onClick={() => onDelete(p)}>
                                    <Trash2 className="h-3 w-3" /> Deletar
                                  </Button>
                                )}
                            </>
                        )}
                    </>
                )}
              </div>
            </div>
          ))}
          {profiles.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</p>}
        </div>
      )}
    </div>
  );
}
