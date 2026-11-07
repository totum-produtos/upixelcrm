import { useState } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";
import { useAppState } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { resolveClientId } from "@/lib/tenant-utils";
import {
  normalizePhoneBR, buildLeadsToInsert,
  type CsvData, type ImportResult, type CustomFieldDefLike,
} from "@/lib/import-parsing";

interface UseLeadImportParams {
  csvData: CsvData | null;
  column: string;
  mapping: Record<string, string>;
  customFieldDefs: CustomFieldDefLike[];
  /** Chamado ao terminar a importação (antes de onComplete). */
  onFinished: () => void;
  /** Chamado após a importação terminar com ao menos 1 lead inserido. */
  onComplete?: (result: ImportResult) => void;
}

/** Executa a importação: dedup por telefone, montagem do payload e insert em lotes com retry. */
export function useLeadImport({
  csvData,
  column,
  mapping,
  customFieldDefs,
  onFinished,
  onComplete,
}: UseLeadImportParams) {
  const { leads, refreshData } = useAppState();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleImport = async () => {
    if (!csvData || !column) return;
    const clientId = resolveClientId(tenant?.id, user?.client_id);
    if (!clientId) { toast.error("Sessão inválida. Faça login novamente."); return; }

    setImporting(true);

    // Re-fetch das definitions DIRETO do banco para garantir que estamos
    // usando a versão mais atualizada (evita race condition se o usuário
    // criou um campo agora mesmo e o estado React ainda não propagou).
    const { data: freshDefs, error: defsError } = await supabase
      .from("custom_field_definitions")
      .select("*")
      .eq("client_id", clientId)
      .order("display_order", { ascending: true });

    if (defsError) {
      logger.error("Erro ao carregar definições de campos:", defsError);
    }

    const activeDefs: CustomFieldDefLike[] = freshDefs ?? customFieldDefs;

    // Busca todos os telefones existentes direto do banco (paginado, evita usar
    // o estado local que pode estar incompleto quando há mais de 1000 leads).
    const existingPhoneKeys = new Set<string>();
    try {
      const PAGE = 1000;
      for (let page = 0; page < 60; page++) {
        const from = page * PAGE;
        const to = from + PAGE - 1;
        const q = supabase
          .from("leads")
          .select("phone")
          .eq("client_id", clientId)
          .not("phone", "is", null)
          .range(from, to);
        const { data, error } = await q;
        if (error) break;
        if (!data || data.length === 0) break;
        for (const r of data) {
          const ph = r.phone;
          if (ph) existingPhoneKeys.add(normalizePhoneBR(ph));
        }
        if (data.length < PAGE) break;
      }
    } catch (err) {
      logger.warn("Falha ao carregar telefones existentes para dedup:", err);
      // Fallback: usa só o que está em estado local
      leads.filter((l) => l.phone).forEach((l) =>
        existingPhoneKeys.add(normalizePhoneBR(l.phone!))
      );
    }

    const { leadsToInsert, skippedNoName, skippedDuplicate } = buildLeadsToInsert({
      csvData,
      mapping,
      defs: activeDefs,
      existingPhoneKeys,
      columnId: column,
      clientId,
      tenantId: tenant?.id,
    });

    let inserted = 0;
    let errors = 0;
    const CHUNK = 500; // Aumentado de 100 para 500: melhor performance

    for (let i = 0; i < leadsToInsert.length; i += CHUNK) {
      const chunk = leadsToInsert.slice(i, i + CHUNK);
      const chunkNum = Math.floor(i / CHUNK) + 1;
      const totalChunks = Math.ceil(leadsToInsert.length / CHUNK);

      setImportResult({
        inserted: inserted,
        skipped: skippedNoName + skippedDuplicate,
        skippedNoName,
        skippedDuplicate,
        errors,
      });

      let retries = 0;
      const maxRetries = 3;
      let success = false;

      while (retries < maxRetries && !success) {
        try {
          const { error } = await supabase.from("leads").insert(chunk);

          if (error) {
            logger.error(`Chunk ${chunkNum}/${totalChunks} error:`, error);
            errors += chunk.length;

            // Tenta novamente com backoff exponencial se for timeout/rate-limit
            if (error.code === "408" || error.code === "429") {
              retries++;
              if (retries < maxRetries) {
                const delayMs = Math.pow(2, retries) * 1000;
                await new Promise(resolve => setTimeout(resolve, delayMs));
                continue;
              }
            }
          } else {
            inserted += chunk.length;
            success = true;
          }
          break;
        } catch (err) {
          logger.error(`Chunk ${chunkNum}/${totalChunks} exception:`, err);
          errors += chunk.length;
          retries++;
          if (retries < maxRetries) {
            const delayMs = Math.pow(2, retries) * 1000;
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }
    }

    if (inserted > 0) await refreshData();

    const skipped = skippedNoName + skippedDuplicate;
    setImportResult({ inserted, skipped, skippedNoName, skippedDuplicate, errors });

    // Exibe feedback detalhado
    if (errors > 0) {
      toast.error(
        `⚠️ Importação parcial: ${inserted} leads importados, ${errors} erros, ${skipped} ignorados. ` +
        `Verifique o console para detalhes dos erros.`
      );
    }

    setImporting(false);
    onFinished();

    if (inserted > 0 && onComplete) {
      onComplete({ inserted, skipped, skippedNoName, skippedDuplicate, errors });
    }
  };

  return { importing, importResult, setImportResult, handleImport };
}
