import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ACCESS_DENIAL_MESSAGES, type AccessDenialReason } from "@/lib/auth-access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SystemImage } from "@/components/system/SystemImage";
import upixelIconLight from "@/assets/upixel_icon_light.png";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const URL_ERROR_MESSAGES: Record<string, string> = {
  expired: "Seu link de acesso expirou ou é inválido. Solicite um novo Magic Link.",
  blocked: ACCESS_DENIAL_MESSAGES.blocked,
  pending: ACCESS_DENIAL_MESSAGES.pending,
  rejected: ACCESS_DENIAL_MESSAGES.rejected,
  wrong_org: ACCESS_DENIAL_MESSAGES.wrong_org,
  wrong_tenant: ACCESS_DENIAL_MESSAGES.wrong_tenant,
} satisfies Record<AccessDenialReason | "expired", string>;

type LoginMode = "password" | "magic";

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [magicEmail, setMagicEmail] = useState("");
  const [magicError, setMagicError] = useState("");
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  const urlError = useMemo(() => {
    const code = searchParams.get("error");
    return code ? URL_ERROR_MESSAGES[code] ?? URL_ERROR_MESSAGES.expired : "";
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);

  const clearUrlError = () => {
    if (searchParams.get("error")) setSearchParams({}, { replace: true });
  };

  const switchMode = (next: LoginMode) => {
    setMode(next);
    setError("");
    setMagicError("");
    setMagicSent(false);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    clearUrlError();
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      navigate("/", { replace: true });
    } else {
      setError(result.error || "E-mail ou senha inválidos");
    }
  }

  async function handleMagicSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMagicError("");
    clearUrlError();

    if (!EMAIL_REGEX.test(magicEmail.trim())) {
      setMagicError("Informe um e-mail válido.");
      return;
    }

    setMagicLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: magicEmail.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setMagicLoading(false);

    if (otpError) {
      setMagicError(otpError.message);
      return;
    }
    setMagicSent(true);
  }

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <div className="grid min-h-[100dvh] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden border-r border-border bg-card/50 p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-3">
            <img src={upixelIconLight} alt="uPixel" className="h-9 w-9" />
            <div>
              <p className="text-sm font-semibold">uPixel CRM</p>
              <p className="text-xs text-muted-foreground">Atendimento, funil e automação</p>
            </div>
          </div>

          <div className="mx-auto w-full max-w-xl space-y-8">
            <div className="rounded-card border border-border bg-background p-4">
              <SystemImage name="sign-in" alt="" className="h-auto w-full rounded-lg" />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight">
                Entre no painel da sua operação comercial.
              </h1>
              <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                Acesse conversas, leads, tarefas e relatórios em um único ambiente conectado ao self-hosted uPixel.
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">Ambiente seguro com autenticação Supabase.</p>
        </section>

        <section className="flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-md space-y-7">
            <div className="space-y-2 text-center lg:text-left">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-card border border-border bg-card lg:mx-0">
                <img src={upixelIconLight} alt="uPixel" className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Acessar uPixel</h2>
              <p className="text-sm text-muted-foreground">
                Use sua senha temporária ou solicite um Magic Link.
              </p>
            </div>

            <div className="rounded-card border border-border bg-card p-5 shadow-card">
              {urlError ? (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <p className="text-xs text-destructive">{urlError}</p>
                </div>
              ) : null}

              <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted p-1">
                <button
                  type="button"
                  onClick={() => switchMode("password")}
                  className={`h-9 rounded-md text-xs font-semibold transition-colors ${
                    mode === "password"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Senha
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("magic")}
                  className={`h-9 rounded-md text-xs font-semibold transition-colors ${
                    mode === "magic"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Magic Link
                </button>
              </div>

              {mode === "password" ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error ? (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                      <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                      <p className="text-xs text-destructive">{error}</p>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="h-11 pl-10"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Senha</Label>
                      <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
                        Esqueci minha senha
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-11 pl-10 pr-10"
                        autoComplete="current-password"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="h-11 w-full font-semibold" disabled={loading}>
                    {loading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              ) : magicSent ? (
                <div className="space-y-3 py-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-semibold">Link enviado</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Enviamos um acesso para <span className="font-medium text-foreground">{magicEmail.trim()}</span>.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleMagicSubmit} className="space-y-4" noValidate>
                  {magicError ? (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                      <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                      <p className="text-xs text-destructive">{magicError}</p>
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="magic-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="magic-email"
                        type="email"
                        value={magicEmail}
                        onChange={(e) => {
                          setMagicEmail(e.target.value);
                          setMagicError("");
                        }}
                        placeholder="seu@email.com"
                        className="h-11 pl-10"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="h-11 w-full font-semibold" disabled={magicLoading}>
                    {magicLoading ? "Enviando..." : "Enviar Magic Link"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
