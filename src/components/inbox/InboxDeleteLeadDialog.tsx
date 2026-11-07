import { AlertCircle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface InboxDeleteLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadName: string;
  onConfirm: () => void;
}

// Confirmação de exclusão do lead (remove também as conversas vinculadas).
export function InboxDeleteLeadDialog({ open, onOpenChange, leadName, onConfirm }: InboxDeleteLeadDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-card border border-[hsl(var(--border-strong))] bg-card">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-bold flex items-center gap-3 text-destructive">
            <div className="h-10 w-10 rounded-card bg-destructive/20 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            Confirmar Exclusão
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm py-2">
            Tem certeza que deseja excluir o perfil de **"{leadName}"**? 
            <br /><br />
            Esta ação excluirá permanentemente o lead do CRM e todas as conversas vinculadas a ele.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="rounded-xl border-none bg-secondary/50 hover:bg-secondary transition-colors">Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="rounded-xl bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/20 px-8"
          >
            Sim, Excluir Perfil
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
