import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function UnderMaintenancePage() {
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
        <rect x="30" y="100" width="140" height="16" rx="8" fill="hsl(var(--muted))" />
        <rect x="30" y="108" width="140" height="4" rx="2" fill="hsl(var(--primary))" opacity="0.25" />
        {/* Gear big */}
        <circle cx="80" cy="72" r="28" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="2" />
        <circle cx="80" cy="72" r="10" fill="hsl(var(--background))" stroke="hsl(var(--muted-foreground))" strokeWidth="2" opacity="0.4" />
        {/* Gear teeth */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = 80 + Math.cos(rad) * 28;
          const y1 = 72 + Math.sin(rad) * 28;
          const x2 = 80 + Math.cos(rad) * 36;
          const y2 = 72 + Math.sin(rad) * 36;
          return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--muted-foreground))" strokeWidth="5" strokeLinecap="round" opacity="0.35" />;
        })}
        {/* Gear small */}
        <circle cx="128" cy="56" r="18" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="2" />
        <circle cx="128" cy="56" r="6" fill="hsl(var(--background))" stroke="hsl(var(--muted-foreground))" strokeWidth="2" opacity="0.4" />
        {[0, 60, 120, 180, 240, 300].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = 128 + Math.cos(rad) * 18;
          const y1 = 56 + Math.sin(rad) * 18;
          const x2 = 128 + Math.cos(rad) * 24;
          const y2 = 56 + Math.sin(rad) * 24;
          return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--muted-foreground))" strokeWidth="4" strokeLinecap="round" opacity="0.3" />;
        })}
        <text x="100" y="20" textAnchor="middle" fontSize="11" fill="hsl(var(--muted-foreground))" opacity="0.5">EM MANUTENCAO</text>
      </svg>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Em manutencao</h1>
      <p className="text-muted-foreground mb-8 max-w-sm">
        Estamos realizando melhorias no sistema. Voltaremos em breve. Obrigado pela compreensao!
      </p>
      <Button asChild variant="outline">
        <Link to="/">Voltar ao inicio</Link>
      </Button>
    </div>
  );
}
