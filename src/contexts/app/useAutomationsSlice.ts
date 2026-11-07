import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import type { Node, Edge } from "reactflow";
import { logger } from "@/lib/logger";
import * as automationsRepo from "@/services/automations";
import { mapComplexAutomation, mapAutomationRule } from "@/contexts/app/mappers";
import type { Json } from "@/integrations/supabase/types";
import type { Lead, Task, Automation, ComplexAutomation } from "@/types";
import type { AddTimelineEvent, AppScope, EngineTriggerType, ExecuteAutomationsRef } from "@/contexts/app/types";

// Maps AppContext basic-rule trigger types → complex automation visual-builder trigger types.
// Module-scoped: stable across renders, no need to memoize or list in hook deps.
//
// `card_entered` NÃO mapeia para nada, de propósito. moveLead dispara os dois
// eventos em sequência (stage_changed, depois card_entered) porque as regras
// básicas são filtradas por trigger.type e cada uma escuta só o seu. Mas este
// mapa não filtra: com card_entered também apontando para "status_change", toda
// automação complexa com gatilho "Mudança de Etapa de Funil" era invocada DUAS
// vezes por movimentação, e o automation-engine envia WhatsApp, então o lead
// recebia a mensagem duplicada.
//
// Mudança de etapa é stage_changed. Lead novo já é coberto por new_lead (addLead
// dispara os dois). Não devolver card_entered para este mapa sem antes deduplicar
// as invocações dentro de executeAutomations.
const complexTriggerMap: Record<string, string[]> = {
  stage_changed: ["status_change"],
  new_lead:      ["new_lead"],
  tag_added:     ["tag_added"],
};

interface AutomationsSliceDeps {
  scope: AppScope;
  /** Funil atual: padrao do pipeline_id ao criar uma regra basica. */
  currentPipelineId: string;
  /** Leads atuais, lidos pelo motor para checar tags e excecoes. */
  leads: Lead[];
  /** Acoes do motor operam sobre leads e tarefas. */
  updateLead: (id: string, data: Partial<Lead>) => Promise<boolean>;
  addTask: (data: Partial<Task>) => Promise<Task | null>;
  moveLead: (id: string, toColumnId: string) => Promise<boolean>;
  addTimelineEvent: AddTimelineEvent;
  /** Preenchido por esta fatia com o motor; a fatia de leads o chama apos mover/criar lead. */
  executeAutomationsRef: ExecuteAutomationsRef;
}

/** Fatia de automacoes: regras basicas, fluxos complexos (visual builder) e o motor de execucao. */
export function useAutomationsSlice({
  scope, currentPipelineId, leads, updateLead, addTask, moveLead, addTimelineEvent, executeAutomationsRef,
}: AutomationsSliceDeps) {
  const { tenantId, userClientId, tenantIdForInsert } = scope;
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [complexAutomations, setComplexAutomations] = useState<ComplexAutomation[]>([]);

  const createAutomation = useCallback(async (name: string): Promise<string | null> => {
    const clientId = tenantId ?? userClientId;
    if (!clientId) {
      toast.error("Sessão inválida. Faça login novamente.");
      return null;
    }

    let row: Awaited<ReturnType<typeof automationsRepo.insertComplexAutomation>>;
    try {
      row = await automationsRepo.insertComplexAutomation({
        client_id: clientId,
        name,
        status: "draft",
        nodes: [],
        edges: [],
        ...tenantIdForInsert,
      });
    } catch (error) {
      logger.error(error);
      const e = error as { message?: string; details?: string };
      const detail = e?.message || e?.details || "Tente novamente.";
      toast.error(`Erro ao criar fluxo: ${detail}`);
      return null;
    }
    if (row) {
      const newAuto = mapComplexAutomation(row);
      setComplexAutomations(prev => [newAuto, ...prev]);
      return newAuto.id;
    }
    return null;
  }, [tenantId, tenantIdForInsert, userClientId]);

  const updateAutomationNodes = useCallback(async (id: string, nodes: Node[], edges: Edge[]) => {
    setComplexAutomations(prev => prev.map(a => a.id === id ? { ...a, nodes, edges } : a));

    try {
      await automationsRepo.updateComplexAutomation(id, {
        nodes,
        edges,
        updated_at: new Date().toISOString(),
      });
      toast.success("Fluxo salvo com sucesso!");
    } catch (error) {
      logger.error(error); toast.error("Erro ao salvar fluxo");
    }
  }, []);

  const toggleComplexAutomation = useCallback(async (id: string) => {
    const auto = complexAutomations.find(a => a.id === id);
    if (!auto) return;
    const newStatus = auto.status === 'active' ? 'draft' : 'active';

    setComplexAutomations(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));

    try {
      await automationsRepo.updateComplexAutomation(id, { status: newStatus });
      toast.success("Fluxo " + (newStatus === 'active' ? "Ativado" : "Desativado"));
    } catch (error) {
      logger.error(error);
      setComplexAutomations(prev => prev.map(a => a.id === id ? { ...a, status: auto.status } : a));
      toast.error("Erro ao alterar status do fluxo");
    }
  }, [complexAutomations]);

  const deleteAutomation = useCallback(async (id: string) => {
    try {
      await automationsRepo.deleteComplexAutomation(id);
    } catch (error) {
      logger.error(error); toast.error("Erro ao excluir"); return;
    }
    setComplexAutomations(prev => prev.filter(a => a.id !== id));
    toast.success("Automação excluída");
  }, []);

  const toggleBasicAutomation = useCallback(async (id: string) => {
    const rule = automations.find(a => a.id === id);
    if (!rule) return;
    const newStatus = !rule.active;

    setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: newStatus } : a));

    try {
      await automationsRepo.updateAutomationRule(id, { active: newStatus });
      toast.success("Automação " + (newStatus ? "ativada" : "desativada"));
    } catch (error) {
      logger.error(error);
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: rule.active } : a));
      toast.error("Erro ao atualizar automação");
    }
  }, [automations]);

  const deleteBasicAutomation = useCallback(async (id: string) => {
    try {
      await automationsRepo.deleteAutomationRule(id);
    } catch (error) {
      logger.error(error); toast.error("Erro ao excluir"); return;
    }
    setAutomations(prev => prev.filter(a => a.id !== id));
    toast.success("Automação removida");
  }, []);

  const addBasicAutomation = useCallback(async (data: Partial<Automation>) => {
    const clientId = tenantId ?? userClientId;
    if (!clientId) { toast.error("Sessão inválida. Faça login novamente."); return; }

    let row: Awaited<ReturnType<typeof automationsRepo.insertAutomationRule>>;
    try {
      row = await automationsRepo.insertAutomationRule({
        client_id: clientId,
        pipeline_id: data.pipeline_id || currentPipelineId || null,
        column_id: data.column_id || null,
        name: data.name || "Nova Automação",
        active: true,
        // Os tipos de dominio nao casam estruturalmente com Json (config opcional), por isso o cast.
        trigger: (data.trigger as Json) || { type: "card_entered" },
        actions: (data.actions as Json) || [],
        exceptions: (data.exceptions as Json) || [],
        ...tenantIdForInsert,
      });
    } catch (error) {
      logger.error(error); toast.error("Erro ao criar automação"); return;
    }
    if (row) setAutomations(prev => [mapAutomationRule(row), ...prev]);
    toast.success("Automação criada!");
  }, [currentPipelineId, userClientId, tenantId, tenantIdForInsert]);

  const updateBasicAutomation = useCallback(async (id: string, data: Partial<Automation>) => {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.trigger !== undefined) updateData.trigger = data.trigger;
    if (data.actions !== undefined) updateData.actions = data.actions;
    if (data.exceptions !== undefined) updateData.exceptions = data.exceptions;
    if (data.column_id !== undefined) updateData.column_id = data.column_id;

    try {
      await automationsRepo.updateAutomationRule(id, updateData);
    } catch (error) {
      logger.error(error); toast.error("Erro ao atualizar automação"); return;
    }

    setAutomations(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    toast.success("Automação salva!");
  }, []);

  // AUTOMATION ENGINE
  const runAction = useCallback(async (leadId: string, action: Automation["actions"][0]) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    switch (action.type) {
      case "add_tag":
        if (action.config?.tag) {
          await updateLead(leadId, { tags: [...new Set([...lead.tags, action.config.tag as string])] });
        }
        break;
      case "create_task":
        if (action.config?.title) {
          await addTask({
            lead_id: leadId,
            title: action.config.title as string,
            due_date: new Date().toISOString().split("T")[0],
          });
        }
        break;
      case "move_column":
        if (action.config?.column) {
          await moveLead(leadId, action.config.column as string);
        }
        break;
      default:
        logger.warn("Unhandled action type:", action.type);
    }
  }, [leads, updateLead, addTask, moveLead]);

  const executeAutomations = useCallback(async (leadId: string, triggerType: EngineTriggerType, columnId?: string) => {
    // 1. Run basic automation rules (existing behaviour)
    const activeRules = automations.filter(a =>
      a.active &&
      a.trigger.type === triggerType &&
      (!columnId || a.column_id === columnId)
    );

    for (const rule of activeRules) {
      const lead = leads.find(l => l.id === leadId);
      const hasException = rule.exceptions.some(ex => {
        if (ex.type === "has_tag" && ex.config?.tag) {
          return lead?.tags.includes(ex.config.tag as string);
        }
        return false;
      });

      if (hasException) continue;

      for (const action of rule.actions) {
        await runAction(leadId, action);
      }

      await addTimelineEvent({
        lead_id: leadId,
        type: "automation",
        content: `Automação executada: ${rule.name}`,
        user_name: "Sistema",
      });
    }

    // 2. Trigger active complex (visual-builder) automations via edge function
    const complexEventTypes = complexTriggerMap[triggerType] ?? [];
    if (complexEventTypes.length === 0) return;

    const activeComplex = complexAutomations.filter(a => a.status === "active");
    for (const auto of activeComplex) {
      const nodes: Node[] = auto.nodes || [];
      const triggerNodes = nodes.filter(
        (n) => n.type === "trigger" && complexEventTypes.includes(n.data?.type ?? n.data?.configType)
      );
      for (const trigger of triggerNodes) {
        automationsRepo.triggerAutomationEngine({
          automation_id: auto.id,
          lead_id: leadId,
          node_id: trigger.id,
          context: columnId ? { column_id: columnId } : {},
        }).catch((err: unknown) => logger.error("Complex automation trigger error:", err));
      }
    }
  }, [automations, complexAutomations, leads, runAction, addTimelineEvent]);

  useEffect(() => {
    executeAutomationsRef.current = executeAutomations;
  }, [executeAutomations, executeAutomationsRef]);

  return {
    automations, setAutomations,
    complexAutomations, setComplexAutomations,
    createAutomation, updateAutomationNodes, deleteAutomation, toggleComplexAutomation,
    toggleBasicAutomation, deleteBasicAutomation, addBasicAutomation, updateBasicAutomation,
  };
}
