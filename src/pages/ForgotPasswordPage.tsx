import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
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
      const message = err instanceof Error ? err.message : "Erro ao enviar o email. Tente novamente.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">u</span>
            </div>
            <span className="text-xl font-bold">uPixelCRM</span>
          </div>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Email enviado!</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Enviamos um link de recuperacao para <strong>{email}</strong>.
              Verifique sua caixa de entrada e siga as instrucoes.
            </p>
            <p className="text-xs text-muted-foreground">
              Nao recebeu? Verifique a pasta de spam ou tente novamente.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => { setSent(false); setEmail(""); }}
            >
              Tentar com outro email
            </Button>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Esqueceu sua senha?</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Informe seu email e enviaremos um link para redefinir sua senha.
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
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-10 pl-9"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? "Enviando..." : "Enviar link de recuperacao"}
              </Button>
            </form>
          </>
        )}

        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
