import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import type { CustomFieldType } from "@/types";
import type { CsvData } from "@/lib/import-parsing";

interface CreateFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onNameChange: (name: string) => void;
  type: CustomFieldType;
  onTypeChange: (type: CustomFieldType) => void;
  header: string;
  onHeaderChange: (header: string) => void;
  options: Array<{ label: string; value: string }>;
  typeWasSuggested: boolean;
  creating: boolean;
  csvData: CsvData | null;
  onSubmit: () => void;
}

export function CreateFieldDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  type,
  onTypeChange,
  header,
  onHeaderChange,
  options,
  typeWasSuggested,
  creating,
  csvData,
  onSubmit,
}: CreateFieldDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Criar Campo Personalizado</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome do Campo *</Label>
            <Input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Ex: CPF, Renda Mensal, Aniversário"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo</Label>
            <Select
              value={type}
              onValueChange={(v) => onTypeChange(v as CustomFieldType)}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Texto</SelectItem>
                <SelectItem value="textarea">Texto longo</SelectItem>
                <SelectItem value="number">Número</SelectItem>
                <SelectItem value="date">Data</SelectItem>
                <SelectItem value="datetime">Data e hora</SelectItem>
                <SelectItem value="checkbox">Checkbox (sim/não)</SelectItem>
                <SelectItem value="link">Link</SelectItem>
                <SelectItem value="select">Lista (seleção única)</SelectItem>
                <SelectItem value="multi_select">Múltipla escolha (separadas por ;)</SelectItem>
              </SelectContent>
            </Select>
            {typeWasSuggested && (
              <p className="text-[10px] text-primary flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" />
                Tipo sugerido com base nos valores da planilha. Ajuste se necessário.
              </p>
            )}
          </div>
          {type === "select" && options.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">
                Opções detectadas ({options.length})
              </Label>
              <div className="flex flex-wrap gap-1">
                {options.map((opt) => (
                  <Badge key={opt.value} variant="outline" className="text-[10px]">
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {csvData && (
            <div className="space-y-1.5">
              <Label className="text-xs">Vincular à coluna da planilha (opcional)</Label>
              <Select value={header || "__none"} onValueChange={(v) => onHeaderChange(v === "__none" ? "" : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione uma coluna" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">{"\u2014 Sem vínculo \u2014"}</SelectItem>
                  {csvData.headers.map((h) => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Esse campo aparecerá no perfil dos leads após a importação.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancelar
          </Button>
          <Button size="sm" onClick={onSubmit} disabled={creating || !name.trim()}>
            {creating ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Criando...</> : "Criar Campo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
