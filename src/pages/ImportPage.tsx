import { useState, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { toast } from "sonner";
import { useAppState } from "@/contexts/AppContext";
import { useCustomFields } from "@/hooks/useCustomFields";
import { useImportFileReader } from "@/hooks/useImportFileReader";
import { useCreateFieldDialog } from "@/hooks/useCreateFieldDialog";
import { useLeadImport } from "@/hooks/useLeadImport";
import { ImportStepper } from "@/components/import/ImportStepper";
import { UploadStep } from "@/components/import/UploadStep";
import { PipelineStep } from "@/components/import/PipelineStep";
import { MappingStep } from "@/components/import/MappingStep";
import { ImportResultStep } from "@/components/import/ImportResultStep";
import { CreateFieldDialog } from "@/components/import/CreateFieldDialog";
import { autoMapHeaders, type CsvData, type ImportResult } from "@/lib/import-parsing";

interface ImportPageProps {
  /** Quando true, não renderiza o AppLayout (modo embedded, usado dentro de modal/Dialog). */
  embedded?: boolean;
  /** Pré-seleciona o pipeline alvo. */
  initialPipelineId?: string;
  /** Pré-seleciona a coluna alvo. Se combinado com initialPipelineId, pula a tela de seleção. */
  initialColumnId?: string;
  /** Quando true + ambos initials acima, desabilita os selectors (usuário não pode trocar). */
  lockTarget?: boolean;
  /** Callback invocado após a importação terminar com sucesso (qualquer leads inserted > 0). */
  onComplete?: (result: ImportResult) => void;
}

export default function ImportPage({
  embedded = false,
  initialPipelineId,
  initialColumnId,
  lockTarget = false,
  onComplete,
}: ImportPageProps = {}) {
  const { pipelines, columns } = useAppState();
  const { definitions: customFieldDefs, createField, fetchDefinitions } = useCustomFields();

  const [step, setStep] = useState(1);
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [fileName, setFileName] = useState("");
  const [pipelineId, setPipelineId] = useState(initialPipelineId ?? "");
  const [column, setColumn] = useState(initialColumnId ?? "");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const availablePipelines = pipelines;
  const pipelineColumns = columns.filter((c) => c.pipeline_id === pipelineId);

  const { importing, importResult, setImportResult, handleImport } = useLeadImport({
    csvData,
    column,
    mapping,
    customFieldDefs,
    onFinished: () => setStep(4),
    onComplete,
  });

  const createFieldDialog = useCreateFieldDialog({
    csvData,
    createField,
    fetchDefinitions,
    onFieldMapped: (slug, header) => setMapping((prev) => ({ ...prev, [`cf:${slug}`]: header })),
  });

  const applyParsed = useCallback((parsed: CsvData, file: File) => {
    if (parsed.headers.length === 0) {
      toast.error("Arquivo vazio ou inválido.");
      return;
    }
    setCsvData(parsed);
    setFileName(file.name);
    // Auto-map: tenta casar cabeçalhos com os campos do sistema pelo nome
    setMapping(autoMapHeaders(parsed.headers));
    // Auto-select first pipeline/column
    if (availablePipelines.length > 0 && !pipelineId) {
      const firstPipeline = availablePipelines[0];
      setPipelineId(firstPipeline.id);
      const firstCol = columns.filter((c) => c.pipeline_id === firstPipeline.id).sort((a, b) => a.order - b.order)[0];
      if (firstCol) setColumn(firstCol.id);
    }
    // Quando o alvo (pipeline + coluna) já veio pré-definido, pula a tela 2 e vai
    // direto pro mapeamento: o usuário já decidiu onde os leads vão.
    const hasPreselectedTarget = !!(initialPipelineId && initialColumnId);
    setStep(hasPreselectedTarget ? 3 : 2);
    toast.success(`${parsed.rows.length} registros carregados de "${file.name}".`);
  }, [availablePipelines, columns, pipelineId, initialPipelineId, initialColumnId]);

  const readFile = useImportFileReader(applyParsed);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  }, [readFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  }, [readFile]);

  const clearFile = () => {
    setCsvData(null);
    setFileName("");
    setImportResult(null);
    setStep(1);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handlePipelineChange = (pid: string) => {
    setPipelineId(pid);
    const firstCol = columns.filter((c) => c.pipeline_id === pid).sort((a, b) => a.order - b.order)[0];
    setColumn(firstCol?.id ?? "");
  };

  const selectedPipeline = pipelines.find((p) => p.id === pipelineId);
  const selectedColumn = columns.find((c) => c.id === column);

  const body = (
    <div className={`animate-fade-in ${embedded ? "max-w-3xl mx-auto" : "p-6 max-w-3xl mx-auto"}`}>
      <ImportStepper step={step} onStepClick={setStep} />

      {step === 1 && (
        <UploadStep
          dragOver={dragOver}
          onDragOverChange={setDragOver}
          inputRef={inputRef}
          onInputChange={handleInputChange}
          onDrop={handleDrop}
        />
      )}

      {step === 2 && (
        <PipelineStep
          csvData={csvData}
          fileName={fileName}
          pipelines={availablePipelines}
          pipelineColumns={pipelineColumns}
          pipelineId={pipelineId}
          column={column}
          lockTarget={lockTarget}
          onPipelineChange={handlePipelineChange}
          onColumnChange={setColumn}
          onClearFile={clearFile}
          onContinue={() => setStep(3)}
        />
      )}

      {step === 3 && csvData && (
        <MappingStep
          csvData={csvData}
          mapping={mapping}
          customFieldDefs={customFieldDefs}
          importing={importing}
          onMappingChange={(key, value) => setMapping((p) => ({ ...p, [key]: value }))}
          onOpenCreateField={createFieldDialog.openFor}
          onBack={() => setStep(2)}
          onImport={handleImport}
        />
      )}

      {step === 4 && importResult && (
        <ImportResultStep
          result={importResult}
          pipelineName={selectedPipeline?.name}
          columnName={selectedColumn?.name}
          onReset={clearFile}
        />
      )}

      <CreateFieldDialog
        open={createFieldDialog.open}
        onOpenChange={createFieldDialog.setOpen}
        name={createFieldDialog.name}
        onNameChange={createFieldDialog.setName}
        type={createFieldDialog.type}
        onTypeChange={createFieldDialog.changeType}
        header={createFieldDialog.header}
        onHeaderChange={createFieldDialog.setHeader}
        options={createFieldDialog.options}
        typeWasSuggested={createFieldDialog.typeWasSuggested}
        creating={createFieldDialog.creating}
        csvData={csvData}
        onSubmit={createFieldDialog.submit}
      />
    </div>
  );

  if (embedded) return body;
  return (
    <AppLayout title="Importação de Leads" subtitle="Importe sua base de contatos via CSV ou Excel">
      <div className="p-6">{body}</div>
    </AppLayout>
  );
}
