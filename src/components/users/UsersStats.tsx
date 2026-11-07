import type { LucideIcon } from "lucide-react";

export interface UsersStat {
  label: string;
  value: number;
  icon: LucideIcon;
}

interface UsersStatsProps {
  stats: UsersStat[];
}

export function UsersStats({ stats }: UsersStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl ghost-border bg-card p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
            <s.icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold text-foreground">{s.value}</p>
          <p className="text-xs text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
