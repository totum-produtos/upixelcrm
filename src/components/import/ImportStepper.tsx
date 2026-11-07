import { ArrowRight, CheckCircle2 } from "lucide-react";

const STEP_LABELS = ["Upload", "Pipeline", "Mapeamento", "Confirmar"];

interface ImportStepperProps {
  step: number;
  onStepClick: (step: number) => void;
}

export function ImportStepper({ step, onStepClick }: ImportStepperProps) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {STEP_LABELS.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <button
            onClick={() => { if (i + 1 < step) onStepClick(i + 1); }}
            disabled={i + 1 > step}
            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${step > i + 1 ? "bg-success text-success-foreground cursor-pointer" : step === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {step > i + 1 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
          </button>
          <span className={`text-xs font-medium hidden sm:inline ${step === i + 1 ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
          {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />}
        </div>
      ))}
    </div>
  );
}
