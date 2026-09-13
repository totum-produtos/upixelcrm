import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
      <svg
        width="200"
        height="160"
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-8 opacity-80"
        aria-hidden="true"
      >
        <circle cx="100" cy="80" r="60" fill="hsl(var(--muted))" />
        <circle cx="100" cy="80" r="60" stroke="hsl(var(--border))" strokeWidth="2" />
        <rect x="84" y="55" width="32" height="24" rx="4" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="2.5" opacity="0.5" />
        <rect x="80" y="75" width="40" height="30" rx="6" fill="hsl(var(--muted-foreground))" opacity="0.3" />
        <circle cx="100" cy="90" r="4" fill="hsl(var(--background))" opacity="0.8" />
        <line x1="48" y1="48" x2="152" y2="132" stroke="hsl(var(--destructive))" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        <text x="100" y="20" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--muted-foreground))" opacity="0.5">403</text>
      </svg>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Acesso negado</h1>
      <p className="text-muted-foreground mb-8 max-w-sm">
        Voce nao tem permissao para acessar esta pagina. Entre em contato com o administrador se acredita que isso e um erro.
      </p>
      <Button asChild>
        <Link to="/">Voltar ao inicio</Link>
      </Button>
    </div>
  );
}
