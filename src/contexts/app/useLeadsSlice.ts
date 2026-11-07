import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import * as leadsRepo from "@/services/leads";
import { listActiveAgents } from "@/services/users";
import { reassignConversationsToLead } from "@/services/inbox";
import { mapLead } from "@/contexts/app/mappers";
import type { Lead, Pipeline, PipelineColumn, Task } from "@/types";
import type { AddTimelineEvent, AppScope, ExecuteAutomationsRef, StateSetter } from "@/contexts/app/types";

interface LeadsSliceDeps {
  scope: AppScope;
  /** Somente leitura: moveLead/moveLeadToPipeline nomeiam colunas e funis na timeline. */
  columns: PipelineColumn[];
  pipelines: Pipeline[];
  addTimelineEvent: AddTimelineEvent;
  /** Excluir um lead tambem remove as tarefas dele do estado. */
  setTasks: StateSetter<Task[]>;
  /** Motor de automacoes (fatia de automacoes), acionado apos mover/criar lead. */
  executeAutomationsRef: ExecuteAutomationsRef;
}

/** Fatia de leads: estado, contagem por funil, rastreio de carga e CRUD/movimentacao/merge. */
export function useLeadsSlice({
  scope, columns, pipelines, addTimelineEvent, setTasks, executeAutomationsRef,
}: LeadsSliceDeps) {
  const { tenantId, userClientId, tenantIdForInsert } = scope;

  const [leads, setLeads] = useState<Lead[]>([]);
  // Espelha `leads` sem entrar em dependências de useCallback: leads muda a
  // cada drag/realtime, e updateLead é passado pra baixo em muitos lugares;
  // colocar `leads` na dep array desestabilizaria a identidade da função.
  const leadsRef = useRef<Lead[]>([]);
  useEffect(() => { leadsRef.current = leads; }, [leads]);
  const [leadCountByPipeline, setLeadCountByPipeline] = useState<Record<string, number>>({});

  // A carga de leads roda em background (FASE 3) com a UI já interativa. Sem
  // rastrear o que o usuário mexeu nesse meio-tempo, o snapshot do servidor
  // sobrescrevia a mutação otimista: card voltava de coluna, lead criado sumia,
  // deletado ressuscitava. O gen invalida a carga anterior numa troca de tenant.
  const leadsFetchGen = useRef(0);
  const leadsFetchActive = useRef(false);
  const dirtyLeadIds = useRef(new Set<string>());

  /** Marca um lead alterado localmente enquanto a carga em background acontece. */
  const markLeadDirty = useCallback((id: string) => {
    if (leadsFetchActive.current) dirtyLeadIds.current.add(id);
  }, []);

  const updateLead = useCallback(async (id: string, data: Partial<Lead>): Promise<boolean> => {
    // Capturado ANTES do update, pra poder comparar valor antigo x novo.
    const before = leadsRef.current.find((l) => l.id === id);
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.company !== undefined) updateData.company = data.company || null;
    if (data.position !== undefined) updateData.position = data.position || null;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.value !== undefined) updateData.value = data.value ?? null;
    if (data.responsible_id !== undefined) updateData.responsible_id = data.responsible_id || null;
    if (data.segmento !== undefined) updateData.segmento = data.segmento || null;
    if (data.faturamento_mensal !== undefined) updateData.faturamento_mensal = data.faturamento_mensal ?? null;
    if (data.origin !== undefined) updateData.origin = data.origin || null;
    if (data.category !== undefined) updateData.category = data.category || null;
    if (data.column_id !== undefined) updateData.column_id = data.column_id;
    if (data.notes_local !== undefined) updateData.notes_local = data.notes_local || null;
    if (data.custom_fields !== undefined) updateData.custom_fields = data.custom_fields || {};

    try {
      await leadsRepo.updateLead(id, updateData);
    } catch (error) {
      logger.error(error); toast.error("Erro ao atualizar lead"); return false;
    }

    markLeadDirty(id);
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...data, updated_at: new Date().toISOString() } : l));

    // Edição de nota já grava seu próprio evento específico ("Nota
    // adicionada/editada/removida"): duplicar aqui infla a métrica
    // contacts_made das metas (conta eventos type=note). Responsável mudou:
    // evento específico com os nomes, em vez do genérico "Lead atualizado"
    // que não dizia o que de fato mudou.
    const onlyNotesChanged = Object.keys(updateData).length === 1 && "notes_local" in updateData;
    if (onlyNotesChanged) {
      // nada: evento específico já foi gravado por quem chamou updateLead.
    } else if (data.responsible_id !== undefined && data.responsible_id !== before?.responsible_id) {
      const clientId = tenantId ?? userClientId;
      const ids = [before?.responsible_id, data.responsible_id].filter((v): v is string => !!v);
      const agents = clientId && ids.length > 0 ? await listActiveAgents(clientId).catch(() => []) : [];
      const nameOf = (agentId?: string | null) => agentId ? (agents.find((a) => a.id === agentId)?.name ?? agentId) : "Ninguém";
      await addTimelineEvent({
        lead_id: id,
        type: "note",
        content: `Responsável alterado: de ${nameOf(before?.responsible_id)} para ${nameOf(data.responsible_id)}`,
        user_name: "Usuário",
      });
    } else {
      await addTimelineEvent({ lead_id: id, type: "note", content: "Lead atualizado", user_name: "Usuário" });
    }
    return true;
  }, [addTimelineEvent, markLeadDirty, tenantId, userClientId]);

  const moveLead = useCallback(async (id: string, toColumnId: string): Promise<boolean> => {
    const lead = leads.find((l) => l.id === id);
    // Já está na coluna destino: nada a fazer, mas não é erro.
    if (!lead || lead.column_id === toColumnId) return true;

    const fromCol = columns.find((c) => c.id === lead.column_id);
    const toCol = columns.find((c) => c.id === toColumnId);

    // Optimistic update
    markLeadDirty(id);
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, column_id: toColumnId, updated_at: new Date().toISOString() } : l));

    try {
      await leadsRepo.updateLead(id, { column_id: toColumnId });
    } catch (error) {
      logger.error(error);
      // Rollback
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, column_id: lead.column_id } : l));
      toast.error("Erro ao mover lead");
      return false;
    }

    // Etapa de outro funil: sem nomear o funil, o timeline vira "movido de
    // Qualificação para Qualificação": todo funil novo nasce com as mesmas
    // 3 etapas, então só o nome da coluna não diz o que aconteceu.
    const crossPipeline =
      !!fromCol && !!toCol && fromCol.pipeline_id !== toCol.pipeline_id;
    const pipeName = (pipelineId?: string) =>
      pipelines.find((p) => p.id === pipelineId)?.name ?? "?";
    await addTimelineEvent({
      lead_id: id,
      type: "stage_change",
      content: crossPipeline
        ? `"${lead.name}" movido de ${fromCol?.name ?? "?"} (funil "${pipeName(fromCol?.pipeline_id)}") para ${toCol?.name ?? "?"} (funil "${pipeName(toCol?.pipeline_id)}")`
        : `"${lead.name}" movido de ${fromCol?.name ?? "?"} para ${toCol?.name ?? "?"}`,
      user_name: "Usuário",
    });

    // Trigger automations for transition
    if (executeAutomationsRef.current) {
      await executeAutomationsRef.current(id, "stage_changed", toColumnId);
      await executeAutomationsRef.current(id, "card_entered", toColumnId);
    }
    return true;
  }, [leads, columns, pipelines, addTimelineEvent, markLeadDirty, executeAutomationsRef]);

  const moveLeadToPipeline = useCallback(async (id: string, toPipelineId: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;

    const targetPipelineColumns = columns.filter(c => c.pipeline_id === toPipelineId);
    if (targetPipelineColumns.length === 0) {
      toast.error("Funil de destino não possui colunas");
      return;
    }

    const firstColumnOfNewPipeline = targetPipelineColumns.sort((a, b) => a.order - b.order)[0];
    const fromPipeline = pipelines.find(p => columns.find(c => c.id === lead.column_id)?.pipeline_id === p.id);
    const toPipeline = pipelines.find(p => p.id === toPipelineId);

    // Optimistic update
    markLeadDirty(id);
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, column_id: firstColumnOfNewPipeline.id, updated_at: new Date().toISOString() } : l));

    try {
      await leadsRepo.updateLead(id, { column_id: firstColumnOfNewPipeline.id });
    } catch (error) {
      logger.error(error);
      // Rollback
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, column_id: lead.column_id } : l));
      toast.error("Erro ao mover lead entre funis");
      return;
    }

    toast.success(`Lead movido de "${fromPipeline?.name}" para "${toPipeline?.name}"`);

    await addTimelineEvent({
      lead_id: id,
      type: "stage_change",
      content: `"${lead.name}" movido do funil "${fromPipeline?.name ?? "?"}" para "${toPipeline?.name ?? "?"}"`,
      user_name: "Usuário",
    });
  }, [leads, columns, pipelines, addTimelineEvent, markLeadDirty]);

  const addLead = useCallback(async (data: Partial<Lead>, columnId: string): Promise<Lead | null> => {
    const clientId = tenantId ?? userClientId;
    if (!clientId) { toast.error("Sessão inválida. Faça login novamente."); return null; }

    let row: Awaited<ReturnType<typeof leadsRepo.insertLead>>;
    try {
      row = await leadsRepo.insertLead({
        name: data.name ?? "",
        phone: data.phone || null,
        email: data.email || null,
        company: data.company || null,
        position: data.position || null,
        city: data.city || null,
        origin: data.origin || "Manual",
        tags: data.tags ?? [],
        column_id: columnId,
        value: data.value ?? null,
        responsible_id: data.responsible_id || null,
        segmento: data.segmento || null,
        faturamento_mensal: data.faturamento_mensal ?? null,
        client_id: clientId,
        utm_source: data.utm_source || null,
        utm_medium: data.utm_medium || null,
        utm_campaign: data.utm_campaign || null,
        utm_content: data.utm_content || null,
        utm_term: data.utm_term || null,
        ad_campaign_id: data.ad_campaign_id || null,
        ad_adset_id: data.ad_adset_id || null,
        ad_id: data.ad_id || null,
        fbclid: data.fbclid || null,
        gclid: data.gclid || null,
        ...tenantIdForInsert,
      });
    } catch (error) {
      logger.error(error); toast.error("Erro ao criar lead"); return null;
    }
    const newLead = mapLead(row!);
    markLeadDirty(newLead.id);
    setLeads((prev) => [newLead, ...prev]);

    await addTimelineEvent({
      lead_id: newLead.id,
      type: "stage_change",
      content: `Lead "${newLead.name}" criado e adicionado ao pipeline`,
      user_name: "Sistema",
    });

    toast.success("Lead criado com sucesso");

    // Trigger automations for entry and new lead
    if (executeAutomationsRef.current) {
      await executeAutomationsRef.current(newLead.id, "card_entered", columnId);
      await executeAutomationsRef.current(newLead.id, "new_lead");
    }

    return newLead;
  }, [addTimelineEvent, userClientId, tenantId, tenantIdForInsert, markLeadDirty, executeAutomationsRef]);

  const deleteLead = useCallback(async (id: string) => {
    try {
      await leadsRepo.bulkDeleteLeads([id]);
    } catch (error) {
      logger.error(error); toast.error("Erro ao excluir lead"); return;
    }
    markLeadDirty(id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setTasks((prev) => prev.filter((t) => t.lead_id !== id));
    toast.success("Lead excluído");
  }, [markLeadDirty, setTasks]);

  const mergeLeads = useCallback(async (sourceLeadId: string, targetLeadId: string) => {
    try {
      // Erro em conversations aborta, como no original
      await reassignConversationsToLead(sourceLeadId, targetLeadId);

      // Se tasks/timeline não forem reapontados, NÃO deleta o lead de origem:
      // antes o delete rodava mesmo assim e os dados sumiam por cascade.
      await leadsRepo.reassignTasksToLead(sourceLeadId, targetLeadId);
      await leadsRepo.reassignTimelineToLead(sourceLeadId, targetLeadId);

      await leadsRepo.bulkDeleteLeads([sourceLeadId]);

      markLeadDirty(sourceLeadId);
      setLeads((prev) => prev.filter((l) => l.id !== sourceLeadId));
      toast.success("Leads mesclados com sucesso.");
    } catch (err) {
      logger.error(err);
      toast.error(`Erro ao mesclar leads: ${(err as Error).message}`);
    }
  }, [markLeadDirty]);

  return {
    leads, setLeads,
    leadCountByPipeline, setLeadCountByPipeline,
    /** Rastreio da carga em background, consumido por useAppDataLoader. */
    leadsFetch: { gen: leadsFetchGen, active: leadsFetchActive, dirty: dirtyLeadIds },
    addLead, updateLead, deleteLead, moveLead, moveLeadToPipeline, mergeLeads,
  };
}
