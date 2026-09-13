import { useState } from 'react';
import { Archive, Construction, File, Inbox, Send, Star, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const folders = [
  { id: 'inbox', label: 'Inbox', icon: Inbox, count: 128 },
  { id: 'drafts', label: 'Rascunhos', icon: File, count: 3 },
  { id: 'sent', label: 'Enviados', icon: Send, count: undefined },
  { id: 'starred', label: 'Favoritos', icon: Star, count: undefined },
  { id: 'archive', label: 'Arquivo', icon: Archive, count: undefined },
  { id: 'trash', label: 'Lixeira', icon: Trash2, count: undefined },
];

const mockEmails = [
  {
    id: '1',
    from: 'William Smith',
    email: 'williamsmith@example.com',
    subject: 'Reunião amanhã para discutir o projeto',
    preview: 'Oi, vamos ter uma reunião amanhã para discutir o projeto. Tenho algumas ideias para compartilhar...',
    time: '9h25',
    unread: true,
    labels: ['reunião', 'trabalho'],
  },
  {
    id: '2',
    from: 'Alice Johnson',
    email: 'alice@example.com',
    subject: 'Relatório Q3 — Revisão Necessária',
    preview: 'Segue em anexo o relatório do Q3. Por favor, revise e me retorne com comentários até sexta...',
    time: 'ontem',
    unread: true,
    labels: ['relatório'],
  },
  {
    id: '3',
    from: 'Carlos Mendes',
    email: 'carlos@agencia.com',
    subject: 'Proposta de parceria — uPixel x Agência',
    preview: 'Olá! Gostaríamos de explorar uma parceria estratégica entre a nossa agência e o uPixel...',
    time: 'seg',
    unread: false,
    labels: ['parceria'],
  },
  {
    id: '4',
    from: 'Fernanda Lima',
    email: 'fernanda@cliente.com',
    subject: 'Dúvida sobre integração WhatsApp',
    preview: 'Boa tarde! Estou tentando configurar a integração com o WhatsApp Business e tenho uma dúvida...',
    time: 'dom',
    unread: false,
    labels: ['suporte'],
  },
];

export default function EmailPage() {
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [selectedEmail, setSelectedEmail] = useState(mockEmails[0]);

  return (
    <AppLayout title="E-mail" subtitle="Central de e-mails da equipe.">
      {/* Mockup banner */}
      <div className="mb-4">
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <Construction className="h-4 w-4 shrink-0" />
          <div>
            <span className="font-semibold mr-2">MOCKUP</span>
            Este canal está em desenvolvimento. Os dados exibidos são de demonstração.
          </div>
        </div>
      </div>

      {/* 3-column mail layout */}
      <div className="flex h-[calc(100vh-220px)] min-h-[500px] overflow-hidden rounded-xl border bg-background shadow-sm">
        {/* Folder sidebar */}
        <div className="w-48 shrink-0 border-r flex flex-col">
          <div className="p-3">
            <Button className="w-full" size="sm">
              Novo E-mail
            </Button>
          </div>
          <nav className="flex-1 overflow-y-auto px-2 pb-2">
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setActiveFolder(folder.id)}
                className={cn(
                  'w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors mb-0.5',
                  activeFolder === folder.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <div className="flex items-center gap-2.5">
                  <folder.icon className="h-4 w-4" />
                  {folder.label}
                </div>
                {folder.count !== undefined && (
                  <span className="text-xs tabular-nums">{folder.count}</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Email list */}
        <div className="w-72 shrink-0 border-r flex flex-col">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold text-sm capitalize">
              {folders.find((f) => f.id === activeFolder)?.label}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto divide-y">
            {mockEmails.map((email) => (
              <button
                key={email.id}
                type="button"
                onClick={() => setSelectedEmail(email)}
                className={cn(
                  'w-full text-left px-4 py-3 hover:bg-accent/40 transition-colors',
                  selectedEmail.id === email.id && 'bg-accent',
                  email.unread && 'font-medium',
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm truncate">{email.from}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0">{email.time}</span>
                </div>
                <p className="text-xs font-medium truncate mb-1">{email.subject}</p>
                <p className="text-xs text-muted-foreground truncate">{email.preview}</p>
                {email.labels.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {email.labels.map((l) => (
                      <Badge key={l} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {l}
                      </Badge>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Email view */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedEmail ? (
            <>
              <div className="border-b px-6 py-4">
                <h2 className="text-base font-semibold mb-1">{selectedEmail.subject}</h2>
                <p className="text-sm text-muted-foreground">
                  De: <span className="text-foreground">{selectedEmail.from}</span>{' '}
                  &lt;{selectedEmail.email}&gt;
                </p>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedEmail.preview}</p>
                <p className="text-sm text-muted-foreground leading-relaxed mt-4">
                  Aguardamos o seu retorno. Atenciosamente,<br />
                  {selectedEmail.from}
                </p>
              </div>
              <div className="border-t px-6 py-3 flex gap-2">
                <Button size="sm" variant="outline" disabled>Responder</Button>
                <Button size="sm" variant="outline" disabled>Encaminhar</Button>
                <Button size="sm" variant="outline" disabled>
                  <Archive className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" disabled>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
              Selecione um e-mail
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
