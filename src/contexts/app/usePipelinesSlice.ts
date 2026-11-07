import { useState, useCallback } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import * as leadsRepo from "@/services/leads";
import { mapPipeline, mapColumn } from "@/contexts/app/mappers";
import type { Pipeline, PipelineColumn } from "@/types";
import type { AppScope } from "@/contexts/app/types";

/** Fatia de funis: pipelines, colunas, funil selecionado e CRUD correspondente. */
export function usePipelinesSlice(scope: AppScope) {
  const { tenantId, userClientId, tenantIdForInsert, isMasterView } = scope;
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [currentPipelineId, setCurrentPipelineId] = useState<string>("");

  const addPipeline = useCallback(async (name: string) => {
    const clientId = tenantId ?? userClientId;
    if (!clientId) { toast.error("Sessão inválida. Faça login novamente."); return; }

    let row: Awaited<ReturnType<typeof leadsRepo.insertPipeline>>;
    try {
      row = await leadsRepo.insertPipeline({ name, client_id: clientId, ...tenantIdForInsert });
    } catch (error) {
      logger.error(error); toast.error("Erro ao criar funil"); return;
    }
    if (row) {
      const newPipe = mapPipeline(row);
      setPipelines((prev) => [...prev, newPipe]);
      setCurrentPipelineId(newPipe.id);

      // Criar colunas padrão para o novo funil (erro era ignorado no original, preservado)
      const defaultCols = [
        { name: "Novos Leads", color: "#3b82f6", order: 0, pipeline_id: newPipe.id, client_id: clientId, ...tenantIdForInsert },
        { name: "Qualificação", color: "#f59e0b", order: 1, pipeline_id: newPipe.id, client_id: clientId, ...tenantIdForInsert },
        { name: "Fechamento", color: "#22c55e", order: 2, pipeline_id: newPipe.id, client_id: clientId, ...tenantIdForInsert },
      ];

      const colRows = await leadsRepo.insertPipelineColumns(defaultCols).catch(() => null);
      if (colRows) setColumns((prev) => [...prev, ...colRows.map((c) => mapColumn(c))]);

      toast.success("Funil criado com sucesso");
    }
  }, [userClientId, tenantId, tenantIdForInsert]);

  const updatePipeline = useCallback(async (id: string, data: Partial<Pipeline>) => {
    try {
      await leadsRepo.updatePipeline(id, data);
    } catch (error) {
      logger.error(error); toast.error("Erro ao atualizar funil"); return;
    }
    setPipelines((prev) => prev.map((p) => p.id === id ? { ...p, ...data } : p));
    toast.success("Funil atualizado");
  }, []);

  const deletePipeline = useCallback(async (id: string) => {
    // Delete columns first to be safe (cascade should handle this but let's be explicitly).
    // Erro só era logado no original, preservado
    // clientId vazio filtra tudo (fail-closed): o cascade do funil cobre as colunas.
    await leadsRepo.deleteColumnsByPipeline(id, tenantId ?? userClientId ?? "", isMasterView).catch((colError) => { logger.error(colError); });

    try {
      await leadsRepo.deletePipelineById(id);
    } catch (error) {
      logger.error(error); toast.error("Erro ao excluir funil"); return;
    }

    setPipelines((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      if (currentPipelineId === id && filtered.length > 0) {
        setCurrentPipelineId(filtered[0].id);
      }
      return filtered;
    });
    setColumns((prev) => prev.filter((c) => c.pipeline_id !== id));
    toast.success("Funil excluído com sucesso");
  }, [currentPipelineId, tenantId, userClientId, isMasterView]);

  const addColumn = useCallback(async (name: string, color: string) => {
    if (!currentPipelineId) { toast.error("Selecione um funil primeiro"); return; }

    const clientId = tenantId ?? userClientId;
    if (!clientId) { toast.error("Sessão inválida. Faça login novamente."); return; }

    // Get max order for current pipeline
    const pipelineCols = columns.filter(c => c.pipeline_id === currentPipelineId);
    const maxOrder = pipelineCols.length > 0 ? Math.max(...pipelineCols.map(c => c.order)) : -1;

    let row: Awaited<ReturnType<typeof leadsRepo.insertPipelineColumn>>;
    try {
      row = await leadsRepo.insertPipelineColumn({
        name,
        color,
        order: maxOrder + 1,
        pipeline_id: currentPipelineId,
        client_id: clientId,
        ...tenantIdForInsert,
      });
    } catch (error) {
      logger.error(error);
      toast.error("Erro ao criar coluna: " + ((error as { message?: string })?.message ?? ""));
      return;
    }
    if (row) setColumns((prev) => [...prev, mapColumn(row)]);
    toast.success("Coluna criada");
  }, [columns, currentPipelineId, tenantId, tenantIdForInsert, userClientId]);

  const updateColumn = useCallback(async (id: string, data: Partial<PipelineColumn>): Promise<boolean> => {
    try {
      await leadsRepo.updatePipelineColumn(id, data);
    } catch (error) {
      logger.error(error); toast.error("Erro ao atualizar coluna"); return false;
    }
    setColumns((prev) => prev.map((c) => c.id === id ? { ...c, ...data } : c));
    toast.success("Coluna atualizada");
    return true;
  }, []);

  const deleteColumn = useCallback(async (id: string): Promise<boolean> => {
    try {
      await leadsRepo.deletePipelineColumn(id);
    } catch (error) {
      logger.error(error); toast.error("Erro ao excluir coluna"); return false;
    }
    setColumns((prev) => prev.filter((c) => c.id !== id));
    toast.success("Coluna removida");
    return true;
  }, []);

  /**
   * Reordena colunas do funil ativo. Recebe lista de IDs na nova ordem.
   * Atomic: faz N updates sequenciais (N = ~5 colunas). Otimista no estado local
   * primeiro; em caso de erro, recarrega do banco pra restaurar consistência.
   */
  const reorderColumns = useCallback(async (orderedIds: string[]) => {
    // Optimistic: aplica ordem nova no estado local imediatamente
    const newOrder = new Map(orderedIds.map((id, idx) => [id, idx]));
    setColumns((prev) =>
      prev.map((c) => newOrder.has(c.id) ? { ...c, order: newOrder.get(c.id)! } : c)
    );

    // Persiste: 1 UPDATE por coluna. Pra >20 colunas considerar batch RPC.
    const results = await Promise.allSettled(
      orderedIds.map((id, idx) => leadsRepo.updatePipelineColumn(id, { order: idx })),
    );
    const failed = results.find((r) => r.status === "rejected");
    if (failed) {
      logger.error("Erro ao reordenar colunas:", (failed as PromiseRejectedResult).reason);
      toast.error("Erro ao salvar nova ordem. Recarregando...");
      // Força refetch pra restaurar estado consistente (erro ignorado como no original)
      const data = await leadsRepo.listAllPipelineColumns().catch(() => null);
      if (data) setColumns(data.map((c) => mapColumn(c)));
      return;
    }
  }, []);

  return {
    pipelines, setPipelines,
    columns, setColumns,
    currentPipelineId, setCurrentPipelineId,
    addPipeline, updatePipeline, deletePipeline,
    addColumn, updateColumn, deleteColumn, reorderColumns,
  };
}
