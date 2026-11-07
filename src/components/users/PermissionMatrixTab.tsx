import { PERMISSION_MATRIX } from "@/hooks/usePermissions";
import { ALL_PERMISSIONS, ROLES_DISPLAY } from "./constants";

export function PermissionMatrixTab() {
  return (
    <div className="bg-card ghost-border rounded-xl mx-auto max-w-5xl overflow-hidden">
      <div className="px-4 py-3 ghost-border border-b flex justify-between items-center">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Matriz de Permissões — RBAC</h2>
          <p className="text-xs text-muted-foreground">O que cada função pode acessar no sistema</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-secondary/50">
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Recurso</th>
              {ROLES_DISPLAY.map(r => (
                <th key={r.key} className={`text-center px-3 py-2.5 font-semibold ${r.color}`}>{r.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ALL_PERMISSIONS.map((perm) => (
              <tr key={perm.key} className="hover:bg-card-hover transition-colors">
                <td className="px-4 py-2.5 font-medium text-foreground">
                  <span>{perm.label}</span>
                  <span className="ml-2 text-[10px] text-muted-foreground/60 font-mono">{perm.key}</span>
                </td>
                {ROLES_DISPLAY.map(r => {
                  const allowed = PERMISSION_MATRIX[perm.key];
                  const hasIt = allowed ? allowed.includes(r.key) : false;
                  return (
                    <td key={r.key} className="text-center px-3 py-2.5">
                      <span className={`inline-flex items-center justify-center h-6 w-6 rounded-md text-xs font-bold transition-colors ${
                        hasIt
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-destructive/10 text-destructive/50"
                      }`}>
                        {hasIt ? "✓" : "✕"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t ghost-border">
        <p className="text-[10px] text-muted-foreground">⚡ Usuários com role <strong>Master</strong> possuem acesso irrestrito a todas as permissões acima.</p>
      </div>
    </div>
  );
}
