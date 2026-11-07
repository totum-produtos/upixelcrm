import { useState, useCallback, useEffect, type MutableRefObject } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import * as leadsRepo from "@/services/leads";
import * as automationsRepo from "@/services/automations";
import { reconcileLeads } from "@/lib/reconcile-leads";
import {
  mapPipeline, mapColumn, mapLead, mapTask, mapTimeline, mapComplexAutomation, mapAutomationRule,
} from "@/contexts/app/mappers";
import type { Lead, Pipeline, PipelineColumn, Task, Automation, TimelineEvent, ComplexAutomation } from "@/types";
import type { AppScope, StateSetter } from "@/contexts/app/types";

interface AppDataLoaderDeps {
  scope: AppScope;
  /** Lido so na primeira carga (auto-selecao de funil); fora das deps de propósito, ver fetchAll. */
  currentPipelineId: string;
  setPipelines: StateSetter<Pipeline[]>;
  setCurrentPipelineId: StateSetter<string>;
  setColumns: StateSetter<PipelineColumn[]>;
  setTasks: StateSetter<Task[]>;
  setTimeline: StateSetter<TimelineEvent[]>;
  setComplexAutomations: StateSetter<ComplexAutomation[]>;
  setAutomations: StateSetter<Automation[]>;
  setLeads: StateSetter<Lead[]>;
  setLeadCountByPipeline: StateSetter<Record<string, number>>;
  /** Rastreio da carga em background (fatia de leads). */
  leadsFetch: {
    gen: MutableRefObject<number>;
    active: MutableRefObject<boolean>;
    dirty: MutableRefObject<Set<string>>;
  };
}

/**
 * Carga inicial (e `refreshData`) de todos os dominios, em 3 fases:
 * estruturas + contagem rapida, contagens por funil e leads completos em background.
 * Dona do flag `loading`.
 */
export function useAppDataLoader({
  scope, currentPipelineId,
  setPipelines, setCurrentPipelineId, setColumns, setTasks, setTimeline,
  setComplexAutomations, setAutomations, setLeads, setLeadCountByPipeline,
  leadsFetch,
}: AppDataLoaderDeps) {
  const { tenantId, userClientId, isMasterView } = scope;
  const { gen: leadsFetchGen, active: leadsFetchActive, dirty: dirtyLeadIds } = leadsFetch;
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    // Return early (and clear loading) if auth has not resolved a valid client_id yet.
    // Master view bypassa o filtro por client_id, então só precisa de user autenticado.
    const clientId = tenantId ?? userClientId ?? "";
    if (!clientId && !isMasterView) { setLoading(false); return; }

    const gen = ++leadsFetchGen.current;
    leadsFetchActive.current = true;
    dirtyLeadIds.current.clear();

    try {
      // FASE 1: estruturas + count rápido (libera UI em ~500ms)
      // Carrega pipelines, columns, tasks, automations e SÓ os column_ids
      // de todos os leads para calcular contagens. UI fica pronta antes
      // de baixar os dados completos dos leads.
      // Falha em um recurso não derruba os demais (o original checava
      // res.data por recurso), por isso o .catch(() => null) individual.
      const PAGE = 1000;

      const [pipeData, colData, taskData, tlData, autoData, rulesData, totalCount] = await Promise.all([
        leadsRepo.listPipelines(clientId, isMasterView).catch(() => null),
        leadsRepo.listPipelineColumns(clientId, isMasterView).catch(() => null),
        leadsRepo.listTasks(clientId, isMasterView).catch(() => null),
        leadsRepo.listTimelineEvents(clientId, isMasterView).catch(() => null),
        automationsRepo.listComplexAutomations(clientId, isMasterView).catch(() => null),
        automationsRepo.listAutomationRules(clientId, isMasterView).catch(() => null),
        leadsRepo.countLeads(clientId, isMasterView).catch(() => null),
      ]);

      // Aplica estruturas imediatamente (CRM já fica navegável)
      if (pipeData) {
        setPipelines(pipeData.map((p) => mapPipeline(p)));
        if (pipeData.length > 0 && !currentPipelineId) {
          setCurrentPipelineId(pipeData[0].id);
        }
      }
      if (colData) setColumns(colData.map((c) => mapColumn(c)));
      if (taskData) setTasks(taskData.map((t) => mapTask(t)));
      if (tlData) setTimeline(tlData.map((t) => mapTimeline(t)));
      if (autoData) setComplexAutomations(autoData.map((a) => mapComplexAutomation(a)));
      if (rulesData) setAutomations(rulesData.map((r) => mapAutomationRule(r)));

      // FASE 2: contagens por pipeline via column_id-only (rápido, só UUIDs)
      // Permite mostrar quantos leads tem cada funil ANTES de baixar tudo
      const total = totalCount ?? 0;
      if (total > 0) {
        const colToPipeline = new Map<string, string>();
        if (colData) {
          colData.forEach((c) => colToPipeline.set(c.id, c.pipeline_id));
        }
        const counts: Record<string, number> = {};
        const pageCount = Math.ceil(total / PAGE);
        const colIdRequests = Array.from({ length: pageCount }, (_, page) => {
          const from = page * PAGE;
          const to = from + PAGE - 1;
          // Página com erro é pulada, como no original
          return leadsRepo.listLeadColumnIdsPage(clientId, isMasterView, from, to).catch(() => null);
        });

        // Paraleliza paginations leves (só column_id)
        const BATCH = 5;
        for (let i = 0; i < colIdRequests.length; i += BATCH) {
          const batch = colIdRequests.slice(i, i + BATCH);
          const results = await Promise.all(batch);
          for (const rows of results) {
            if (!rows) continue;
            for (const row of rows) {
              const cid = row.column_id;
              if (!cid) continue;
              const pid = colToPipeline.get(cid);
              if (!pid) continue;
              counts[pid] = (counts[pid] ?? 0) + 1;
            }
          }
        }
        setLeadCountByPipeline(counts);

        // Auto-switch para o pipeline com mais leads, APENAS na primeira carga,
        // quando o user ainda não fez escolha. Se rodasse em toda carga, o usuário
        // não conseguiria selecionar funis vazios (esse useEffect dispara em mudança
        // de currentPipelineId, daí o efeito de "sempre volta pro principal").
        const isFirstLoad = !currentPipelineId;
        if (isFirstLoad) {
          const activePid = pipeData?.[0]?.id ?? "";
          if (activePid && (counts[activePid] ?? 0) === 0) {
            const bestPid = Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0];
            if (bestPid && bestPid !== activePid) {
              setCurrentPipelineId(bestPid);
            }
          }
        }
      }

      // Libera o loading principal: UI fica navegável agora
      setLoading(false);

      // FASE 3 (em background): baixa leads completos
      // Não bloqueia o render. Quando chegar, atualiza estado.
      if (total > 0) {
        const pageCount = Math.ceil(total / PAGE);
        const pageRequests = Array.from({ length: pageCount }, (_, page) => {
          const from = page * PAGE;
          const to = from + PAGE - 1;
          // Página com erro loga e segue, como no original
          return leadsRepo.listLeadsPage(clientId, isMasterView, from, to).catch((err) => {
            logger.error("fetchAllLeads page error:", err);
            return null;
          });
        });

        const BATCH = 5;
        const all: Awaited<ReturnType<typeof leadsRepo.listLeadsPage>> = [];
        for (let i = 0; i < pageRequests.length; i += BATCH) {
          const batch = pageRequests.slice(i, i + BATCH);
          const results = await Promise.all(batch);
          for (const rows of results) {
            if (rows) all.push(...rows);
          }
          if (i === 0 && all.length > 0) {
            logger.info("First lead from DB:", { name: all[0].name, custom_fields: all[0].custom_fields });
          }
          // Carga obsoleta (troca de tenant/master view): quem manda é o fetch novo.
          if (gen !== leadsFetchGen.current) return;
          // Atualiza progressivamente: cada batch já aparece nos cards, sem
          // atropelar o que o usuário mexeu enquanto os batches chegavam.
          const mapped = all.map(mapLead);
          // Cópia do conjunto agora: o updater roda depois, e o finally abaixo
          // limpa dirtyLeadIds antes disso. Sem a cópia, o último lote via o
          // conjunto vazio e desfazia o que o usuário mexeu durante a carga.
          const dirty = new Set(dirtyLeadIds.current);
          setLeads((prev) => reconcileLeads(prev, mapped, dirty));
        }
      } else if (gen === leadsFetchGen.current) {
        const dirty = new Set(dirtyLeadIds.current);
        setLeads((prev) => reconcileLeads(prev, [], dirty));
      }
    } catch (err) {
      logger.error("Error fetching data:", err);
      toast.error("Erro ao carregar dados");
      setLoading(false);
    } finally {
      // setLoading(false) já é chamado dentro do try após FASE 1.
      // Garantimos aqui caso ocorra erro antes.
      // Encerra o rastreamento, salvo se um fetch mais novo já assumiu o estado.
      if (leadsFetchGen.current === gen) {
        leadsFetchActive.current = false;
        dirtyLeadIds.current.clear();
      }
    }
    // currentPipelineId NÃO entra nas deps: o fetchAll filtra por client_id/tenant,
    // não por pipeline. Re-buscar tudo a cada troca de funil é desperdício
    // (era o que causava re-fetchs constantes ao trocar entre funis).
    // O auto-switch initial usa isFirstLoad (currentPipelineId vazio) e roda 1x.
    // Os demais itens (setters e refs) sao estaveis, listados so por exaustividade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tenantId, userClientId, isMasterView,
    setPipelines, setCurrentPipelineId, setColumns, setTasks, setTimeline,
    setComplexAutomations, setAutomations, setLeads, setLeadCountByPipeline,
    leadsFetchGen, leadsFetchActive, dirtyLeadIds,
  ]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { loading, fetchAll };
}
