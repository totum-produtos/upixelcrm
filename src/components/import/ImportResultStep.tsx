import { CheckCircle2, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ImportResult } from "@/lib/import-parsing";

interface ImportResultStepProps {
  result: ImportResult;
  pipelineName?: string;
  columnName?: string;
  onReset: () => void;
}

export function ImportResultStep({ result, pipelineName, columnName, onReset }: ImportResultStepProps) {
  return (
    <div className="bg-card ghost-border rounded-xl p-12 text-center space-y-4">
      <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Importação Concluída!</h3>
        <p className="text-sm text-muted-foreground">
          Pipeline: <span className="font-medium text-foreground">{pipelineName}</span>
          {" · "}
          Etapa: <span className="font-medium text-foreground">{columnName}</span>
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
        <div className="bg-success/10 rounded-xl p-3">
          <p className="text-xl font-bold text-success">{result.inserted}</p>
          <p className="text-[11px] text-muted-foreground">Importados</p>
        </div>
        <div className="bg-muted rounded-xl p-3">
          <p className="text-xl font-bold text-foreground">{result.skipped}</p>
          <p className="text-[11px] text-muted-foreground">Ignorados</p>
        </div>
        <div className={`rounded-xl p-3 ${result.errors > 0 ? "bg-destructive/10" : "bg-muted"}`}>
          <p className={`text-xl font-bold ${result.errors > 0 ? "text-destructive" : "text-foreground"}`}>
            {result.errors}
          </p>
          <p className="text-[11px] text-muted-foreground">Erros</p>
        </div>
      </div>

      {result.skipped > 0 && (
        <div className="text-xs text-muted-foreground flex flex-col items-center gap-1">
          <p className="flex items-center gap-1">
            <SkipForward className="h-3.5 w-3.5" />
            {result.skipped} lead(s) ignorado(s):
          </p>
          <ul className="list-disc pl-5 text-left">
            {result.skippedDuplicate > 0 && (
              <li>
                <strong>{result.skippedDuplicate}</strong> com telefone já existente na base
              </li>
            )}
            {result.skippedNoName > 0 && (
              <li>
                <strong>{result.skippedNoName}</strong> sem nome (campo "Nome" não mapeado ou vazio na planilha)
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="flex justify-center gap-3 pt-2">
        <Button variant="outline" size="sm" className="text-xs" onClick={onReset}>
          Nova Importação
        </Button>
        <Button size="sm" className="text-xs bg-primary hover:bg-[#e04400] text-primary-foreground" asChild>
          <a href="/crm">Ver no CRM</a>
        </Button>
      </div>
    </div>
  );
}
