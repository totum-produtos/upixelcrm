import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function InternalServerErrorPage() {
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
        <rect x="20" y="50" width="160" height="90" rx="12" fill="hsl(var(--muted))" />
        <rect x="20" y="50" width="160" height="24" rx="12" fill="hsl(var(--destructive))" opacity="0.15" />
        <circle cx="38" cy="62" r="5" fill="hsl(var(--destructive))" opacity="0.6" />
        <circle cx="54" cy="62" r="5" fill="hsl(var(--muted-foreground))" opacity="0.3" />
        <circle cx="70" cy="62" r="5" fill="hsl(var(--muted-foreground))" opacity="0.3" />
        <rect x="36" y="88" width="128" height="6" rx="3" fill="hsl(var(--muted-foreground))" opacity="0.2" />
        <rect x="36" y="102" width="90" height="6" rx="3" fill="hsl(var(--muted-foreground))" opacity="0.2" />
        <rect x="36" y="116" width="110" height="6" rx="3" fill="hsl(var(--destructive))" opacity="0.15" />
        <text x="100" y="22" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--destructive))" opacity="0.7">500</text>
      </svg>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Erro interno do servidor</h1>
      <p className="text-muted-foreground mb-8 max-w-sm">
        Algo deu errado no servidor. Nossa equipe foi notificada. Tente novamente em alguns instantes.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
        <Button asChild>
          <Link to="/">Voltar ao inicio</Link>
        </Button>
      </div>
    </div>
  );
}
