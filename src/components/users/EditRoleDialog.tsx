import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { ProfileRow } from "./types";

interface EditRoleDialogProps {
  profile: ProfileRow | null;
  role: string;
  isMaster: boolean;
  onRoleChange: (role: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function EditRoleDialog({ profile, role, isMaster, onRoleChange, onClose, onSave }: EditRoleDialogProps) {
  return (
    <Dialog open={!!profile} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Alterar Permissão</DialogTitle>
          <DialogDescription>Altere o nível de acesso do usuário no sistema.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">Usuário: <strong className="text-foreground">{profile?.name}</strong></p>
          <div className="space-y-1.5">
            <Label className="text-xs">Nível de Permissão</Label>
            <Select value={role} onValueChange={onRoleChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {isMaster && <SelectItem value="master">Master</SelectItem>}
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="atendente">Atendente</SelectItem>
                <SelectItem value="vendedor">Vendedor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={onSave}>Salvar Acesso</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
