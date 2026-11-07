import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type { CreateUserForm, OrgRow } from "./types";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CreateUserForm;
  onFormChange: (form: CreateUserForm) => void;
  orgs: OrgRow[];
  creating: boolean;
  onSubmit: () => void;
}

export function CreateUserDialog({ open, onOpenChange, form, onFormChange, orgs, creating, onSubmit }: CreateUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
          <DialogDescription>Crie uma conta de usuário no sistema. O usuário será aprovado automaticamente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome Completo</Label>
            <Input
              placeholder="João Silva"
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
              disabled={creating}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">E-mail</Label>
            <Input
              placeholder="usuario@empresa.com"
              type="email"
              value={form.email}
              onChange={(e) => onFormChange({ ...form, email: e.target.value })}
              disabled={creating}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Senha Temporária</Label>
            <Input
              placeholder="Senha segura"
              type="password"
              value={form.password}
              onChange={(e) => onFormChange({ ...form, password: e.target.value })}
              disabled={creating}
            />
            <p className="text-[10px] text-muted-foreground">O usuário poderá alterar a senha no primeiro acesso</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Função/Permissão</Label>
            <Select value={form.role || "vendedor"} onValueChange={(role) => onFormChange({ ...form, role })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="master">Master</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="atendente">Atendente</SelectItem>
                <SelectItem value="vendedor">Vendedor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Empresa (Opcional)</Label>
            <Select value={form.organization_id || "none"} onValueChange={(org_id) => onFormChange({ ...form, organization_id: org_id === "none" ? "" : org_id })}>
              <SelectTrigger><SelectValue placeholder="Nenhuma empresa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma empresa</SelectItem>
                {orgs && orgs.length > 0 && orgs.map((org) => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancelar
          </Button>
          <Button size="sm" onClick={onSubmit} disabled={creating}>
            {creating && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
            Criar Usuário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
