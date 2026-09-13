import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Phone, PhoneCall, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/upixelApi';
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
  const { data, isLoading, isError } = useQuery({
    queryKey: ['voip-status'],
    queryFn: fetchStatus,
    refetchInterval: 30000,
  });

  const callMutation = useMutation({
    mutationFn: startCall,
    onSuccess: () => toast.success('Chamada solicitada'),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erro ao iniciar chamada'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    callMutation.mutate(phone.trim());
  }

  const ready = data?.status === 'ready';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">VoIP</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Discagem via Fonoster integrada ao uPixel.
          </p>
        </div>
        <Badge variant={ready ? 'default' : 'outline'}>
          {ready ? 'Pronto' : 'Aguardando trunk'}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <Card>
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
                />
              </div>
              <Button type="submit" disabled={!ready || callMutation.isPending} className="gap-2">
                <Phone className="h-4 w-4" aria-hidden="true" />
                {callMutation.isPending ? 'Chamando…' : 'Iniciar Chamada'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {isLoading && <p className="text-muted-foreground" role="status" aria-live="polite">Consultando API…</p>}
            {isError && <p className="text-destructive" role="alert">Não foi possível consultar a API VoIP.</p>}
            {data && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Provider</span>
                  <span className="font-medium">{data.provider}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Fonoster</span>
                  <Badge variant={data.fonoster_configured ? 'default' : 'outline'}>
                    {data.fonoster_configured ? 'Configurado' : 'Pendente'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Trunk SIP</span>
                  <Badge variant={data.trunk_ready ? 'default' : 'outline'}>
                    {data.trunk_ready ? 'Liberado' : 'Pendente'}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {!ready && (
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{data?.message ?? 'VoIP ainda depende de trunk SIP compatível. O discador já está preparado para ativação quando o trunk estiver pronto.'}</p>
        </div>
      )}
    </div>
  );
}
