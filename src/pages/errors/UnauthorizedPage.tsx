import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
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
        <rect x="60" y="30" width="80" height="100" rx="12" fill="hsl(var(--muted))" />
        <rect x="60" y="30" width="80" height="36" rx="12" fill="hsl(var(--primary))" opacity="0.15" />
        <circle cx="100" cy="48" r="10" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" opacity="0.6" />
        <line x1="100" y1="58" x2="100" y2="70" stroke="hsl(var(--primary))" strokeWidth="2.5" opacity="0.6" />
        <rect x="80" y="80" width="40" height="6" rx="3" fill="hsl(var(--muted-foreground))" opacity="0.25" />
        <rect x="76" y="94" width="48" height="6" rx="3" fill="hsl(var(--muted-foreground))" opacity="0.2" />
        <rect x="84" y="108" width="32" height="6" rx="3" fill="hsl(var(--muted-foreground))" opacity="0.2" />
        <text x="100" y="18" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--muted-foreground))" opacity="0.5">401</text>
      </svg>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Nao autenticado</h1>
      <p className="text-muted-foreground mb-8 max-w-sm">
        Voce precisa estar logado para acessar esta pagina.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link to="/">Voltar ao inicio</Link>
        </Button>
        <Button asChild>
          <Link to="/login">Fazer login</Link>
        </Button>
      </div>
    </div>
  );
}
