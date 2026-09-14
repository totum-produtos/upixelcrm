import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SystemImage } from "@/components/system/SystemImage";
import upixelIconLight from "@/assets/upixel_icon_light.png";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      if (supabaseError) throw supabaseError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar o e-mail. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <div className="grid min-h-[100dvh] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-md space-y-7">
            <div className="space-y-2 text-center lg:text-left">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-card border border-border bg-card lg:mx-0">
                <img src={upixelIconLight} alt="uPixel" className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Recuperar senha</h1>
              <p className="text-sm leading-6 text-muted-foreground">
                Informe seu e-mail para receber um link seguro de redefinição.
              </p>
            </div>

            <div className="rounded-card border border-border bg-card p-5 shadow-card">
              {sent ? (
                <div className="space-y-4 py-6 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                    <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold">Link enviado</h2>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Enviamos as instruções para <span className="font-medium text-foreground">{email}</span>.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSent(false);
                      setEmail("");
                    }}
                  >
                    Usar outro e-mail
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error ? (
                    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="h-11 pl-10"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="h-11 w-full font-semibold" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar link de recuperação"}
                  </Button>
                </form>
              )}
            </div>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </Link>
          </div>
        </section>

        <section className="hidden border-l border-border bg-card/50 p-10 lg:flex lg:items-center lg:justify-center">
          <div className="w-full max-w-xl space-y-8">
            <div className="rounded-card border border-border bg-background p-4">
              <SystemImage name="forgot-password" alt="" className="h-auto w-full rounded-lg" />
            </div>
            <div className="space-y-3">
              <h2 className="text-4xl font-bold tracking-tight">Sem travar a operação.</h2>
              <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                O reset envia um link temporário e mantém o acesso centralizado no workspace da empresa.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
