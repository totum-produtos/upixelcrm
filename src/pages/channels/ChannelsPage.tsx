import { Link } from 'react-router-dom';
import { Brain, Construction, Mail, MessageSquare, Phone } from 'lucide-react';
import { siWhatsapp, siFacebook, siInstagram } from 'simple-icons';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { SimpleIcon } from '@/components/ui/simple-icon';
import { cn } from '@/lib/utils';

interface ChannelCard {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  status: 'active' | 'mockup';
  badge?: string;
}

const channels: ChannelCard[] = [
  {
    id: 'inbox',
    name: 'Inbox Unificado',
    description: 'Central de atendimento unificada. Todas as conversas de todos os canais em um só lugar.',
    href: '/inbox',
    icon: <MessageSquare className="h-7 w-7" />,
    status: 'active',
    badge: 'Ativo',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Gerencie mensagens, templates e automações do WhatsApp Business.',
    href: '/whatsapp',
    icon: <SimpleIcon icon={siWhatsapp} className="h-7 w-7" useColor />,
    status: 'active',
    badge: 'Ativo',
  },
  {
    id: 'intelligence',
    name: 'Inteligência',
    description: 'Assistente IA operacional, agentes, base de conhecimento e provedores de IA.',
    href: '/intelligence',
    icon: <Brain className="h-7 w-7" />,
    status: 'active',
    badge: 'Ativo',
  },
  {
    id: 'email',
    name: 'E-mail',
    description: 'Centralize e-mails da equipe, gerencie caixas de entrada e templates.',
    href: '/channels/email',
    icon: <Mail className="h-7 w-7" />,
    status: 'mockup',
    badge: 'Em breve',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Atenda DMs e comentários do Instagram diretamente no uPixel.',
    href: '/instagram',
    icon: <SimpleIcon icon={siInstagram} className="h-7 w-7" useColor />,
    status: 'mockup',
    badge: 'Em breve',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Integre mensagens do Messenger e comentários de páginas.',
    href: '/facebook-page',
    icon: <SimpleIcon icon={siFacebook} className="h-7 w-7" useColor />,
    status: 'mockup',
    badge: 'Em breve',
  },
  {
    id: 'voip',
    name: 'VoIP',
    description: 'Discagem e atendimento via voz integrado ao Fonoster. Aguardando trunk SIP.',
    href: '/channels/voip',
    icon: <Phone className="h-7 w-7" />,
    status: 'mockup',
    badge: 'Em desenvolvimento',
  },
];

export default function ChannelsPage() {
  return (
    <AppLayout title="Canais" subtitle="Gerencie todos os seus canais de comunicação em um só lugar.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((channel) => (
          <Link
            key={channel.id}
            to={channel.href}
            className={cn(
              'group relative flex flex-col gap-3 rounded-xl border p-5 transition-all duration-200',
              channel.status === 'active'
                ? 'hover:border-primary/40 hover:shadow-md hover:bg-accent/30 cursor-pointer'
                : 'opacity-70 cursor-pointer hover:opacity-80',
            )}
          >
            {/* Mockup overlay badge */}
            {channel.status === 'mockup' && (
              <div className="absolute top-3 right-3">
                <Badge variant="secondary" className="gap-1 text-[10px] font-medium">
                  <Construction className="h-2.5 w-2.5" />
                  MOCKUP
                </Badge>
              </div>
            )}

            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-lg',
                channel.status === 'active'
                  ? 'bg-primary/10 text-primary group-hover:bg-primary/15'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {channel.icon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm">{channel.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {channel.description}
              </p>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/50">
              <Badge
                variant={channel.status === 'active' ? 'default' : 'outline'}
                className="text-[10px]"
              >
                {channel.badge}
              </Badge>
              {channel.status === 'active' && (
                <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Abrir →
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
