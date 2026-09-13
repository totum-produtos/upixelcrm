import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FlowStep {
  id: string;
  stage: string;
  label: string;
  description: string;
  reply: string;
  next: string | null;
}

const SDR_ODONTO_FLOW: FlowStep[] = [
  {
    id: 'saudacao',
    stage: 'Saudação',
    label: '1. Abertura',
    description: 'Primeira mensagem enviada ao prospect.',
    reply: 'Olá! Sou Israel da equipe Totum. Posso te ajudar a crescer sua clínica com nosso método de prospecção. Você tem 2 minutinhos?',
    next: 'qualificacao',
  },
  {
    id: 'qualificacao',
    stage: 'Qualificação',
    label: '2. Qualificação',
    description: 'Coleta especialidade e localização.',
    reply: 'Perfeito! Pra te ajudar melhor, qual é a sua especialidade principal e em qual cidade você atende?',
    next: 'proposta',
  },
  {
    id: 'proposta',
    stage: 'Proposta',
    label: '3. Proposta',
    description: 'Apresentação personalizada da oferta.',
    reply: 'Entendido! Com base no seu perfil, tenho uma proposta personalizada. Posso compartilhar os detalhes agora?',
    next: 'follow',
  },
  {
    id: 'follow',
    stage: 'Follow-up',
    label: '4. Follow-up',
    description: 'Agendamento de próximo contato.',
    reply: 'Ótimo! Vou te enviar o material. Qual o melhor horário pra conversarmos amanhã: manhã ou tarde?',
    next: 'encerrado',
  },
  {
    id: 'encerrado',
    stage: 'Encerrado',
    label: '5. Encerramento',
    description: 'Conversa finalizada por opt-out ou conclusão.',
    reply: 'Obrigado pelo seu tempo! Qualquer dúvida, estou aqui.',
    next: null,
  },
];

const STAGE_COLORS: Record<string, string> = {
  Saudação: 'bg-blue-100 text-blue-800 border-blue-200',
  Qualificação: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Proposta: 'bg-purple-100 text-purple-800 border-purple-200',
  'Follow-up': 'bg-orange-100 text-orange-800 border-orange-200',
  Encerrado: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function FlowBuilderPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Flow Builder</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualização do flow <span className="font-mono" translate="no">sdr-odonto-v2.6</span>.
        </p>
      </div>

      <div className="relative">
        {SDR_ODONTO_FLOW.map((step, idx) => (
          <div key={step.id} className="relative flex gap-4 mb-2">
            {idx < SDR_ODONTO_FLOW.length - 1 && (
              <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-border" />
            )}

            <div className="relative z-10 flex-none w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-sm font-semibold text-primary">
              {idx + 1}
            </div>

            <Card className="flex-1 mb-4">
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{step.label}</CardTitle>
                  <Badge className={`text-xs border ${STAGE_COLORS[step.stage] ?? ''}`} variant="outline">
                    {step.stage}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-sm bg-muted/50 rounded p-2 italic text-muted-foreground break-words">
                  “{step.reply}”
                </p>
                {step.next && (
                  <p className="text-xs text-muted-foreground mt-2">
                    próxima etapa: <span className="font-mono" translate="no">{step.next}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
