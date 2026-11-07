import type { ChangeEvent, DragEvent, RefObject } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadStepProps {
  dragOver: boolean;
  onDragOverChange: (over: boolean) => void;
  inputRef: RefObject<HTMLInputElement>;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: DragEvent) => void;
}

export function UploadStep({ dragOver, onDragOverChange, inputRef, onInputChange, onDrop }: UploadStepProps) {
  return (
    <div
      className={`bg-card border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-[hsl(var(--border-strong))]"}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); onDragOverChange(true); }}
      onDragLeave={() => onDragOverChange(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={onInputChange}
      />
      <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
      <h3 className="text-sm font-semibold text-foreground mb-1">Arraste seu arquivo aqui</h3>
      <p className="text-xs text-muted-foreground mb-1">ou clique para selecionar um arquivo</p>
      <p className="text-[10px] text-muted-foreground mb-4">Aceita .csv, .xlsx e .xls</p>
      <Button variant="outline" size="sm" className="text-xs">Selecionar Arquivo</Button>
    </div>
  );
}
