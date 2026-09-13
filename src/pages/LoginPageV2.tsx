import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

export default function LoginPageV2() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch {
      setError("Email ou senha incorretos. Verifique suas credenciais.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side — illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary/5 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }} />
        {/* Illustration SVG */}
        <svg
          width="320"
          height="280"
          viewBox="0 0 320 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mb-10 relative z-10"
          aria-hidden="true"
        >
          {/* Dashboard mockup */}
          <rect x="20" y="40" width="280" height="200" rx="16" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
          <rect x="20" y="40" width="280" height="44" rx="16" fill="hsl(var(--primary))" opacity="0.08" />
          <circle cx="44" cy="62" r="6" fill="hsl(var(--primary))" opacity="0.5" />
          <rect x="58" y="57" width="80" height="10" rx="5" fill="hsl(var(--muted-foreground))" opacity="0.2" />
          {/* KPI cards */}
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={40 + i * 62} y="100" width="52" height="40" rx="8" fill="hsl(var(--primary))" opacity={0.06 + i * 0.02} />
          ))}
          {/* Chart bars */}
          {[48, 60, 40, 72, 55, 80, 65].map((h, i) => (
            <rect key={i} x={40 + i * 34} y={200 - h} width="24" height={h} rx="4" fill="hsl(var(--primary))" opacity={0.2 + (i % 3) * 0.1} />
          ))}
          {/* Line on top */}
          <polyline
            points="52,170 86,155 120,168 154,140 188,148 222,130 256,138"
            stroke="hsl(var(--primary))"
            strokeWidth="2.5"
            fill="none"
            opacity="0.6"
          />
          {/* Users floating */}
          <circle cx="260" cy="56" r="12" fill="hsl(var(--primary))" opacity="0.15" />
          <circle cx="260" cy="52" r="5" fill="hsl(var(--primary))" opacity="0.4" />
          <ellipse cx="260" cy="64" rx="8" ry="4" fill="hsl(var(--primary))" opacity="0.3" />
        </svg>
        {/* Logo placeholder */}
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">u</span>
            </div>
            <span className="text-xl font-bold">uPixelCRM</span>
          </div>
          <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
            Gerencie seus leads, automatize seu funil e acelere suas vendas com inteligencia artificial.
          </p>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">u</span>
              </div>
              <span className="text-xl font-bold">uPixelCRM</span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">Entrar na sua conta</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Informe suas credenciais para continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
