import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/upixelApi';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type SdrStage = 'saudacao' | 'qualificacao' | 'proposta' | 'follow' | 'encerrado';

interface SdrConversation {
  id: string;
  phone: string;
  flow_id: string;
  stage: SdrStage;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

const STAGE_COLORS: Record<SdrStage, string> = {
  saudacao: 'bg-blue-100 text-blue-800',
  qualificacao: 'bg-yellow-100 text-yellow-800',
  proposta: 'bg-purple-100 text-purple-800',
  follow: 'bg-orange-100 text-orange-800',
  encerrado: 'bg-gray-100 text-gray-600',
};

const STAGE_LABELS: Record<SdrStage, string> = {
  saudacao: 'Saudação',
  qualificacao: 'Qualificação',
  proposta: 'Proposta',
  follow: 'Follow-up',
  encerrado: 'Encerrado',
};

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

async function fetchConversations(): Promise<SdrConversation[]> {
  const res = await apiFetch('/sdr/conversations');
  if (!res.ok) throw new Error('Erro ao buscar conversas SDR');
  const json = await res.json() as { data: SdrConversation[] };
  return json.data ?? [];
}

async function createConversation(payload: { phone: string; flow_id: string }): Promise<SdrConversation> {
  const res = await apiFetch('/sdr/conversations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erro ao criar conversa SDR');
  const json = await res.json() as { data: SdrConversation };
  return json.data;
}

export default function ConversationsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [flowId, setFlowId] = useState('sdr-odonto-v2.6');

  const { data: conversations = [], isLoading, isError } = useQuery({
    queryKey: ['sdr-conversations'],
    queryFn: fetchConversations,
  });

  const mutation = useMutation({
    mutationFn: createConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-conversations'] });
      setModalOpen(false);
      setPhone('');
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    mutation.mutate({ phone: phone.trim(), flow_id: flowId });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Conversas SDR</h1>
          <p className="text-sm text-muted-foreground mt-1">Prospecção ativa via state machine</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>Nova Conversa</Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {isError && (
        <div className="text-center py-16 text-destructive">
          Erro ao carregar conversas. Verifique a conexão com a API.
        </div>
      )}

      {!isLoading && !isError && conversations.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">Nenhuma conversa SDR ativa</p>
          <p className="text-sm mt-1">Clique em "Nova Conversa" para iniciar uma prospecção.</p>
        </div>
      )}

      {!isLoading && !isError && conversations.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Contato</th>
                <th className="text-left px-4 py-3 font-medium">Flow</th>
                <th className="text-left px-4 py-3 font-medium">Etapa</th>
                <th className="text-left px-4 py-3 font-medium">Última mensagem</th>
                <th className="text-left px-4 py-3 font-medium">Atualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {conversations.map((conv) => (
                <tr key={conv.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono">{conv.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground">{conv.flow_id}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[conv.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STAGE_LABELS[conv.stage] ?? conv.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">
                    {conv.last_message ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {formatDate(conv.last_message_at ?? conv.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Conversa SDR</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                placeholder="5544999990000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flow">Flow</Label>
              <Input
                id="flow"
                value={flowId}
                onChange={(e) => setFlowId(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Criando...' : 'Criar'}
              </Button>
            </DialogFooter>
            {mutation.isError && (
              <p className="text-xs text-destructive">{(mutation.error as Error).message}</p>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
