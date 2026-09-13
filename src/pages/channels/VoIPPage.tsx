import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Info, Phone, PhoneCall, PhoneOff } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/upixelApi';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface VoIPStatus {
  status: 'ready' | 'pending_trunk';
  provider: string;
  fonoster_configured: boolean;
  trunk_ready: boolean;
  ws_url: string | null;
  message: string;
}

async function fetchStatus(): Promise<VoIPStatus> {
  const res = await apiFetch('/voip/status');
  if (!res.ok) throw new Error('Erro ao consultar status VoIP');
  return res.json();
}

async function startCall(phone: string) {
  const res = await apiFetch('/voip/call', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? 'Erro ao iniciar chamada');
  return json;
}

export default function VoIPPage() {
  const [phone, setPhone] = useState('');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['voip-status'],
    queryFn: fetchStatus,
    refetchInterval: 30000,
    retry: 1,
  });

  const callMutation = useMutation({
    mutationFn: startCall,
    onSuccess: () => toast.success('Chamada solicitada com sucesso'),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erro ao iniciar chamada'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    callMutation.mutate(phone.trim());
  }

  const ready = data?.status === 'ready';

  return (
    <AppLayout title="VoIP" subtitle="Discagem via Fonoster integrada ao uPixel.">
      {/* Mockup banner — remove quando trunk SIP estiver ativo */}
      {!ready && (
        <div className="mx-auto max-w-4xl mb-4">
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <span className="font-semibold mr-2">EM DESENVOLVIMENTO</span>
              O discador está pronto. Aguardando configuração do trunk SIP (Fonoster).
              Quando o trunk estiver ativo, a funcionalidade abre automaticamente.
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl space-y-5">
        <div className="grid gap-4 md:grid-cols-[1fr_320px]">
          {/* Discador */}
          <Card className={!ready ? 'opacity-70' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PhoneCall className="h-4 w-4" />
                Discador
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="voip-phone">Telefone</Label>
                  <Input
                    id="voip-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="Ex: 5531999990000…"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={!ready}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={!ready || callMutation.isPending || !phone.trim()}
                    className="gap-2"
                  >
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    {callMutation.isPending ? 'Chamando…' : 'Iniciar Chamada'}
                  </Button>
                  {callMutation.isPending && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => callMutation.reset()}
                    >
                      <PhoneOff className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Status</span>
                <Badge variant={ready ? 'default' : 'secondary'}>
                  {ready ? 'Pronto' : 'Aguardando trunk'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {isLoading && (
                <p className="text-muted-foreground" role="status" aria-live="polite">
                  Consultando API…
                </p>
              )}
              {isError && (
                <div className="space-y-2">
                  <p className="text-destructive" role="alert">
                    Não foi possível consultar a API VoIP.
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                    Tentar Novamente
                  </Button>
                </div>
              )}
              {data && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Provider</span>
                    <span className="font-medium">{data.provider}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Fonoster</span>
                    <Badge variant={data.fonoster_configured ? 'default' : 'outline'} className="text-xs">
                      {data.fonoster_configured ? '✓ Configurado' : 'Pendente'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Trunk SIP</span>
                    <Badge variant={data.trunk_ready ? 'default' : 'outline'} className="text-xs">
                      {data.trunk_ready ? '✓ Ativo' : 'Pendente'}
                    </Badge>
                  </div>
                  {data.ws_url && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">WebSocket</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                        {data.ws_url}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
