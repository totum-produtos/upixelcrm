import { FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { CsvData } from "@/lib/import-parsing";

interface PipelineOption {
  id: string;
  name: string;
}

interface ColumnOption {
  id: string;
  name: string;
  order: number;
}

interface PipelineStepProps {
  csvData: CsvData | null;
  fileName: string;
  pipelines: PipelineOption[];
  /** Colunas do pipeline selecionado. */
  pipelineColumns: ColumnOption[];
  pipelineId: string;
  column: string;
  lockTarget: boolean;
  onPipelineChange: (pipelineId: string) => void;
  onColumnChange: (columnId: string) => void;
  onClearFile: () => void;
  onContinue: () => void;
}

export function PipelineStep({
  csvData,
  fileName,
  pipelines,
  pipelineColumns,
  pipelineId,
  column,
  lockTarget,
  onPipelineChange,
  onColumnChange,
  onClearFile,
  onContinue,
}: PipelineStepProps) {
  return (
    <div className="bg-card ghost-border rounded-xl p-6 space-y-5">
      <h3 className="text-sm font-semibold text-foreground">Selecione o Pipeline e Etapa Inicial</h3>

      {csvData && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted">
          <FileSpreadsheet className="h-5 w-5 text-success" />
          <span className="text-sm font-medium text-foreground">{fileName}</span>
          <Badge variant="outline" className="text-[10px] ml-auto">{csvData.rows.length} registros</Badge>
          <button onClick={onClearFile} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Pipeline</Label>
          <Select
            value={pipelineId}
            onValueChange={onPipelineChange}
            disabled={lockTarget}
          >
            <SelectTrigger><SelectValue placeholder="Selecione o pipeline" /></SelectTrigger>
            <SelectContent>
              {pipelines.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Etapa Inicial</Label>
          <Select
            value={column}
            onValueChange={onColumnChange}
            disabled={!pipelineId || lockTarget}
          >
            <SelectTrigger><SelectValue placeholder="Selecione a etapa" /></SelectTrigger>
            <SelectContent>
              {pipelineColumns
                .sort((a, b) => a.order - b.order)
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {lockTarget && (
        <p className="text-[10px] text-muted-foreground italic">
          Pipeline e etapa pré-definidos pelo contexto. Para mudar, abra a importação pelo menu principal.
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" className="text-xs" onClick={onClearFile}>Voltar</Button>
        <Button
          size="sm"
          className="text-xs bg-primary hover:bg-[#e04400] text-primary-foreground"
          onClick={onContinue}
          disabled={!column}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
