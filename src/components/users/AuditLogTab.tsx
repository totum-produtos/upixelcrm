import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Loader2, RefreshCw } from "lucide-react";
import type { AuditLogRow } from "./types";

interface AuditLogTabProps {
  auditLogs: AuditLogRow[];
  auditLoading: boolean;
  onRefresh: () => void;
}

export function AuditLogTab({ auditLogs, auditLoading, onRefresh }: AuditLogTabProps) {
  return (
    <div className="bg-card ghost-border rounded-xl mx-auto max-w-4xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 ghost-border border-b">
         <div>
            <h2 className="text-sm font-semibold text-foreground">Log de Auditoria</h2>
            <p className="text-xs text-muted-foreground">Histórico de ações recentes na gestão de usuários e permissões</p>
         </div>
         <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onRefresh} disabled={auditLoading}>
           {auditLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
           Atualizar
         </Button>
      </div>
      {auditLoading && auditLogs.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Carregando logs...</div>
      ) : auditLogs.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Nenhum registro de auditoria encontrado.</div>
      ) : (
        <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
          {auditLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{log.action}</p>
                {log.details && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {log.details.target_user && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">Alvo: {log.details.target_user}</Badge>
                    )}
                    {log.details.old_role && log.details.new_role && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {log.details.old_role} → {log.details.new_role}
                      </Badge>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {log.user_name || "Sistema"} · {new Date(log.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
