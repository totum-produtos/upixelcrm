import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/upixelApi';

interface SdrSettingsResponse {
  data: {
    enabled: boolean;
    daily_limit: number;
    delay_min_minutes: number;
    delay_max_minutes: number;
    send_window_start: string;
    send_window_end: string;
  };
}

export default function SDRSettingsPage() {
  const [enabled, setEnabled] = useState(false);
  const [dailyLimit, setDailyLimit] = useState('50');
  const [delayMin, setDelayMin] = useState('2');
  const [delayMax, setDelayMax] = useState('5');
  const [startHour, setStartHour] = useState('08:00');
  const [endHour, setEndHour] = useState('18:00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const res = await apiFetch('/sdr/settings');
        if (!res.ok) throw new Error('Não foi possível carregar as configurações SDR');
        const json = await res.json() as SdrSettingsResponse;
        if (cancelled) return;
        setEnabled(json.data.enabled);
        setDailyLimit(String(json.data.daily_limit));
        setDelayMin(String(json.data.delay_min_minutes));
        setDelayMax(String(json.data.delay_max_minutes));
        setStartHour(json.data.send_window_start.slice(0, 5));
        setEndHour(json.data.send_window_end.slice(0, 5));
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Erro ao carregar configurações SDR');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await apiFetch('/sdr/settings', {
        method: 'PUT',
        body: JSON.stringify({
          enabled,
          daily_limit: Number(dailyLimit),
          delay_min_minutes: Number(delayMin),
          delay_max_minutes: Number(delayMax),
          send_window_start: startHour,
          send_window_end: endHour,
        }),
      });
      if (!res.ok) throw new Error('Não foi possível salvar as configurações SDR');
      toast.success('Configurações SDR salvas');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar configurações SDR');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Configurações SDR</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Controle de envio automático, horários e limites diários.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Motor SDR</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Prospecção automática ativa</p>
                <p className="text-xs text-muted-foreground">Liga o envio automático de mensagens via WhatsApp</p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="daily-limit">Limite diário de novas conversas</Label>
              <Input
                id="daily-limit"
                type="number"
                min={1}
                max={200}
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Máximo de prospects abordados por dia</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Delay entre mensagens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="delay-min">Mínimo (minutos)</Label>
                <Input
                  id="delay-min"
                  type="number"
                  min={1}
                  value={delayMin}
                  onChange={(e) => setDelayMin(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="delay-max">Máximo (minutos)</Label>
                <Input
                  id="delay-max"
                  type="number"
                  min={1}
                  value={delayMax}
                  onChange={(e) => setDelayMax(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Intervalo aleatório entre mensagens para evitar ban do WhatsApp
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Janela de envio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="start-hour">Início</Label>
                <Input
                  id="start-hour"
                  type="time"
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-hour">Fim</Label>
                <Input
                  id="end-hour"
                  type="time"
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Mensagens só são enviadas dentro desta janela horária (horário de Brasília)
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {loading ? 'Carregando...' : saving ? 'Salvando...' : 'Salvar configurações'}
          </Button>
        </div>
      </form>
    </div>
  );
}
