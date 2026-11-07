import { ArrowRight, AlertCircle, Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CSVPreview } from "@/components/import/CSVPreview";
import { SYSTEM_FIELDS, type CsvData } from "@/lib/import-parsing";

interface CustomFieldDefView {
  id: string;
  name: string;
  slug: string;
  field_type: string;
}

interface MappingStepProps {
  csvData: CsvData;
  mapping: Record<string, string>;
  customFieldDefs: CustomFieldDefView[];
  importing: boolean;
  onMappingChange: (key: string, value: string) => void;
  onOpenCreateField: (csvHeader?: string) => void;
  onBack: () => void;
  onImport: () => void;
}

// Texto do item "ignorar" (travessão como escape unicode)
const SKIP_LABEL = "\u2014 Ignorar \u2014";

function HeaderSelect({
  value,
  headers,
  onChange,
}: {
  value: string;
  headers: string[];
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__skip">{SKIP_LABEL}</SelectItem>
        {headers.map((h) => (
          <SelectItem key={h} value={h}>{h}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function MappingStep({
  csvData,
  mapping,
  customFieldDefs,
  importing,
  onMappingChange,
  onOpenCreateField,
  onBack,
  onImport,
}: MappingStepProps) {
  const usedHeaders = new Set(Object.values(mapping).filter((v) => v && v !== "__skip"));
  const unmapped = csvData.headers.filter((h) => !usedHeaders.has(h));

  return (
    <div className="bg-card ghost-border rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Mapeamento de Colunas</h3>
        <p className="text-[11px] text-muted-foreground">Associe as colunas da planilha aos campos do sistema</p>
      </div>

      <div className="space-y-3">
        {SYSTEM_FIELDS.map((field) => (
          <div key={field.key} className="flex items-center gap-3">
            <div className="w-36 flex items-center gap-1.5 shrink-0">
              <span className="text-sm text-foreground">{field.label}</span>
              {field.required && <span className="text-[10px] text-destructive">*</span>}
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
            <HeaderSelect
              value={mapping[field.key] ?? "__skip"}
              headers={csvData.headers}
              onChange={(v) => onMappingChange(field.key, v)}
            />
          </div>
        ))}
      </div>

      {/* Campos personalizados */}
      <div className="pt-2 border-t border-[hsl(var(--border-strong))]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Campos Personalizados</h4>
            <Badge variant="outline" className="text-[9px]">{customFieldDefs.length}</Badge>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-[11px]"
            onClick={() => onOpenCreateField()}
          >
            <Plus className="h-3 w-3" /> Novo Campo
          </Button>
        </div>

        {customFieldDefs.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic py-2">
            Nenhum campo personalizado. Crie um para mapear colunas extras da planilha (ex: CPF, Renda, Origem do Anúncio).
          </p>
        ) : (
          <div className="space-y-3">
            {customFieldDefs.map((def) => (
              <div key={def.id} className="flex items-center gap-3">
                <div className="w-36 flex items-center gap-1.5 shrink-0">
                  <span className="text-sm text-foreground truncate">{def.name}</span>
                  <Badge variant="outline" className="text-[8px] px-1 py-0">{def.field_type}</Badge>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <HeaderSelect
                  value={mapping[`cf:${def.slug}`] ?? "__skip"}
                  headers={csvData.headers}
                  onChange={(v) => onMappingChange(`cf:${def.slug}`, v)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Colunas da planilha sem mapeamento: criação rápida de campo */}
        {unmapped.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-dashed border-border">
            <p className="text-[11px] text-muted-foreground mb-2">
              Colunas da planilha não mapeadas ({unmapped.length}). Crie campos personalizados para incluí-las:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {unmapped.map((h) => (
                <button
                  key={h}
                  onClick={() => onOpenCreateField(h)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-card border border-border hover:border-primary hover:text-primary transition-colors"
                >
                  <Plus className="h-2.5 w-2.5" /> {h}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Prévia */}
      <CSVPreview
        csvHeaders={csvData.headers}
        csvRows={csvData.rows}
        mapping={mapping}
        previewCount={3}
      />

      {/* Aviso de dedup */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 ghost-border">
        <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground">
          Leads com telefone já existente na base serão ignorados automaticamente.
        </span>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" className="text-xs" onClick={onBack}>Voltar</Button>
        <Button
          size="sm"
          className="text-xs bg-primary hover:bg-[#e04400] text-primary-foreground"
          onClick={() => {
            if (!mapping.name || mapping.name === "__skip") {
              toast.error("O campo Nome é obrigatório.");
              return;
            }
            onImport();
          }}
          disabled={importing}
        >
          {importing ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Importando...</>
          ) : (
            "Importar Leads"
          )}
        </Button>
      </div>
    </div>
  );
}
