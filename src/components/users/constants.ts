// Constantes de exibição da página de Usuários & Permissões.

// Todas as chaves de permissão usadas no sistema
export const ALL_PERMISSIONS = [
  { key: "crm.view", label: "CRM — Visualizar" },
  { key: "crm.edit", label: "CRM — Editar" },
  { key: "crm.delete", label: "CRM — Excluir" },
  { key: "crm.export", label: "CRM — Exportar" },
  { key: "crm.transfer", label: "CRM — Transferir Lead" },
  { key: "inbox.view", label: "Inbox — Visualizar" },
  { key: "inbox.reply", label: "Inbox — Responder" },
  { key: "tasks.view", label: "Tarefas — Visualizar" },
  { key: "tasks.create", label: "Tarefas — Criar" },
  { key: "tasks.delete", label: "Tarefas — Excluir" },
  { key: "automations.view", label: "Automações — Visualizar" },
  { key: "automations.edit", label: "Automações — Editar" },
  { key: "reports.view", label: "Relatórios — Dashboard" },
  { key: "users.view", label: "Usuários — Visualizar" },
  { key: "users.manage", label: "Usuários — Gerenciar" },
  { key: "intelligence.view", label: "Inteligência — Visualizar" },
  { key: "settings.view", label: "Configurações — Visualizar" },
];

export const ROLES_DISPLAY = [
  { key: "supervisor", label: "Supervisor", color: "text-primary" },
  { key: "atendente", label: "Atendente", color: "text-blue-500" },
  { key: "vendedor", label: "Vendedor", color: "text-muted-foreground" },
] as const;

export const roleBadge = (role: string) => {
  const map: Record<string, string> = {
    master: "border-red-500/30 bg-red-500/10 text-red-500",
    supervisor: "border-[hsl(var(--border-strong))] bg-primary/10 text-primary",
    atendente: "border-blue-500/30 bg-blue-500/10 text-blue-500",
    vendedor: "border-muted-foreground/30 bg-muted text-muted-foreground",
  };
  return map[role] || map.vendedor;
};
