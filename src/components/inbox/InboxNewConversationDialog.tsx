import { Plus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Lead } from "@/types";

interface InboxNewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: Lead[];
  channel: string;
  onChannelChange: (channel: string) => void;
  leadId: string;
  onLeadIdChange: (leadId: string) => void;
  phone: string;
  onPhoneChange: (phone: string) => void;
  email: string;
  onEmailChange: (email: string) => void;
  onSubmit: () => void;
}

// Modal "Nova conversa": escolhe canal, lead opcional e telefone/e-mail de contato.
export function InboxNewConversationDialog({
  open, onOpenChange, leads, channel, onChannelChange, leadId, onLeadIdChange,
  phone, onPhoneChange, email, onEmailChange, onSubmit,
}: InboxNewConversationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Nova Conversa
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Canal</Label>
            <Select value={channel} onValueChange={onChannelChange}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp" className="text-xs">WhatsApp</SelectItem>
                <SelectItem value="whatsapp_official" className="text-xs">WhatsApp Oficial</SelectItem>
                <SelectItem value="email" className="text-xs">E-mail</SelectItem>
                <SelectItem value="instagram" className="text-xs">Instagram</SelectItem>
                <SelectItem value="webchat" className="text-xs">Webchat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Lead (opcional)</Label>
            <Select value={leadId} onValueChange={v => {
              onLeadIdChange(v);
              const lead = leads.find(l => l.id === v);
              if (lead?.phone) onPhoneChange(lead.phone);
              if (lead?.email) onEmailChange(lead.email || "");
            }}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Selecione um lead..." />
              </SelectTrigger>
              <SelectContent>
                {leads.map(l => (
                  <SelectItem key={l.id} value={l.id} className="text-xs">{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(channel === "whatsapp" || channel === "whatsapp_official" || channel === "webchat") && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Telefone</Label>
              <Input value={phone} onChange={e => onPhoneChange(e.target.value)} placeholder="+55 11 99999-0000" className="text-xs h-9" />
            </div>
          )}

          {channel === "email" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">E-mail</Label>
              <Input value={email} onChange={e => onEmailChange(e.target.value)} placeholder="email@exemplo.com" className="text-xs h-9" />
            </div>
          )}

          <Button className="w-full text-xs" onClick={onSubmit}>
            <MessageCircle className="h-3 w-3 mr-1" /> Iniciar Conversa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
