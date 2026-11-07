import { useState } from "react";
import { toast } from "sonner";
import type { CustomFieldType } from "@/types";
import { suggestFieldType, type CsvData } from "@/lib/import-parsing";

type FieldOption = { label: string; value: string };

interface CreatedField {
  slug?: string;
}

interface UseCreateFieldDialogParams {
  csvData: CsvData | null;
  createField: (params: {
    name: string;
    field_type: CustomFieldType;
    options?: FieldOption[];
    is_required?: boolean;
  }) => Promise<unknown>;
  fetchDefinitions: () => Promise<unknown>;
  /** Vincula a coluna da planilha ao campo recém-criado. */
  onFieldMapped: (slug: string, header: string) => void;
}

/** Estado e ações do modal "Criar Campo Personalizado" da tela de mapeamento. */
export function useCreateFieldDialog({
  csvData,
  createField,
  fetchDefinitions,
  onFieldMapped,
}: UseCreateFieldDialogParams) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<CustomFieldType>("text");
  const [header, setHeader] = useState<string>("");
  const [options, setOptions] = useState<FieldOption[]>([]);
  const [typeWasSuggested, setTypeWasSuggested] = useState(false);
  const [creating, setCreating] = useState(false);

  const openFor = (csvHeader?: string) => {
    setName(csvHeader ?? "");
    setHeader(csvHeader ?? "");
    if (csvHeader) {
      const suggestion = suggestFieldType(csvData, csvHeader);
      setType(suggestion.type);
      setOptions(suggestion.options);
      setTypeWasSuggested(suggestion.type !== "text" || suggestion.options.length > 0);
    } else {
      setType("text");
      setOptions([]);
      setTypeWasSuggested(false);
    }
    setOpen(true);
  };

  const changeType = (next: CustomFieldType) => {
    setType(next);
    setTypeWasSuggested(false);
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome do campo.");
      return;
    }
    setCreating(true);
    const created = await createField({
      name: name.trim(),
      field_type: type,
      is_required: false,
      options: type === "select" || type === "multi_select" ? options : [],
    });
    setCreating(false);
    if (created) {
      const slug = (created as CreatedField).slug;
      if (header && slug) {
        onFieldMapped(slug, header);
      }
      // Refetch para garantir que as definições estão sincronizadas com o banco
      await fetchDefinitions();
      setOpen(false);
      setName("");
      setHeader("");
      setOptions([]);
      setTypeWasSuggested(false);
    }
  };

  return {
    open, setOpen,
    name, setName,
    type, changeType,
    header, setHeader,
    options,
    typeWasSuggested,
    creating,
    openFor,
    submit,
  };
}
