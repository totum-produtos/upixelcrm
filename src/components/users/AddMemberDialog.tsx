import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type { OrgRow } from "./types";

interface AddMemberDialogProps {
  org: OrgRow | null;
  email: string;
  adding: boolean;
  onEmailChange: (email: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function AddMemberDialog({ org, email, adding, onEmailChange, onClose, onSubmit }: AddMemberDialogProps) {
  return (
    <Dialog open={!!org} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar Membro</DialogTitle>
          <DialogDescription>Adicione um usuário existente à empresa {org?.name}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">E-mail do Usuário</Label>
            <Input
              placeholder="usuario@empresa.com"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              type="email"
            />
          </div>
          <Button onClick={onSubmit} disabled={adding || !email.trim()} className="w-full">
            {adding && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Adicionar à Empresa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
