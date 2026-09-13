import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
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
        <rect x="20" y="40" width="160" height="100" rx="12" fill="hsl(var(--muted))" />
        <rect x="40" y="60" width="60" height="8" rx="4" fill="hsl(var(--muted-foreground))" opacity="0.3" />
        <rect x="40" y="76" width="100" height="6" rx="3" fill="hsl(var(--muted-foreground))" opacity="0.2" />
        <rect x="40" y="90" width="80" height="6" rx="3" fill="hsl(var(--muted-foreground))" opacity="0.2" />
        <circle cx="100" cy="28" r="18" fill="hsl(var(--primary))" opacity="0.15" />
        <text x="100" y="34" textAnchor="middle" fontSize="18" fontWeight="bold" fill="hsl(var(--primary))">404</text>
        <circle cx="148" cy="110" r="22" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="148" y="116" textAnchor="middle" fontSize="20">?</text>
      </svg>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Pagina nao encontrada</h1>
      <p className="text-muted-foreground mb-8 max-w-sm">
        A pagina que voce esta procurando nao existe ou foi movida para outro endereco.
      </p>
      <Button asChild>
        <Link to="/">Voltar ao inicio</Link>
      </Button>
    </div>
  );
}
