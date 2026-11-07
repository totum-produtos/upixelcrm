import { useCallback } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { parseCSV, matrixToCsvData, type CsvData } from "@/lib/import-parsing";

/**
 * Lê um arquivo .csv, .xlsx ou .xls e entrega o resultado já parseado para `applyParsed`.
 * O SheetJS é carregado por import dinâmico para ficar fora do bundle inicial.
 */
export function useImportFileReader(applyParsed: (parsed: CsvData, file: File) => void) {
  return useCallback((file: File) => {
    const name = file.name.toLowerCase();
    const isCsv = name.endsWith(".csv") || file.type === "text/csv";
    const isXlsx = name.endsWith(".xlsx") || name.endsWith(".xls");

    if (!isCsv && !isXlsx) {
      toast.error("Apenas arquivos .csv, .xlsx ou .xls são aceitos.");
      return;
    }

    if (isCsv) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        applyParsed(parseCSV(text), file);
      };
      reader.readAsText(file, "UTF-8");
      return;
    }

    // .xlsx / .xls: import dinâmico mantém o SheetJS fora do bundle inicial
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buf = e.target?.result as ArrayBuffer;
        const XLSX = await import("@e965/xlsx");
        const wb = XLSX.read(buf, { type: "array" });
        const firstSheetName = wb.SheetNames[0];
        if (!firstSheetName) {
          toast.error("Planilha sem abas.");
          return;
        }
        const sheet = wb.Sheets[firstSheetName];
        const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false }) as string[][];
        // Descarta linhas vazias (algumas planilhas têm linhas de título em branco)
        const parsed = matrixToCsvData(matrix);
        if (!parsed) {
          toast.error("Planilha vazia.");
          return;
        }
        applyParsed(parsed, file);
      } catch (err) {
        logger.error("xlsx parse error", err);
        toast.error("Falha ao ler o arquivo Excel. Verifique se está corrompido.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, [applyParsed]);
}
