/* eslint-disable react-refresh/only-export-components */
import { useContext, useMemo, useRef, type ReactNode } from "react";
import { useAppScope } from "@/contexts/app/useAppScope";
import { useTimelineSlice } from "@/contexts/app/useTimelineSlice";
import { usePipelinesSlice } from "@/contexts/app/usePipelinesSlice";
import { useTasksSlice } from "@/contexts/app/useTasksSlice";
import { useLeadsSlice } from "@/contexts/app/useLeadsSlice";
import { useAutomationsSlice } from "@/contexts/app/useAutomationsSlice";
import { useAppDataLoader } from "@/contexts/app/useAppDataLoader";
import {
  AppDataContext, AutomationsContext, LeadsContext, PipelinesContext, TasksContext, TimelineContext,
} from "@/contexts/app/domainContexts";
import type {
  AppDataState, AppState, AutomationsState, ExecuteAutomations, LeadsState, PipelinesState, TasksState,
  TimelineState,
} from "@/contexts/app/types";

// Hooks estreitos: preferir estes quando o componente le um unico dominio.
export {
  usePipelinesState, useLeadsState, useTasksState, useAutomationsState, useTimelineState, useAppDataState,
} from "@/contexts/app/domainContexts";

/**
 * Fachada com a forma completa de AppState (junta os seis contextos de dominio).
 * Re-renderiza quando qualquer dominio muda; consumidores de um dominio so
 * devem preferir os hooks estreitos acima.
 */
export function useAppState(): AppState {
  const pipelines = useContext(PipelinesContext);
  const leads = useContext(LeadsContext);
  const tasks = useContext(TasksContext);
  const automations = useContext(AutomationsContext);
  const timeline = useContext(TimelineContext);
  const appData = useContext(AppDataContext);

  return useMemo(() => {
    if (!pipelines || !leads || !tasks || !automations || !timeline || !appData) {
      throw new Error("useAppState must be used within AppProvider");
    }
    return { ...pipelines, ...leads, ...tasks, ...automations, ...timeline, ...appData };
  }, [pipelines, leads, tasks, automations, timeline, appData]);
}

/**
 * Provider do CRM. O estado e as acoes vivem em fatias por dominio
 * (src/contexts/app/*); aqui elas sao compostas, as operacoes que cruzam
 * dominios recebem explicitamente o que precisam (setters, motor de automacoes)
 * e cada dominio e publicado em seu proprio contexto, com valor memoizado.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const scope = useAppScope();

  // Ponte entre leads e automacoes: a fatia de automacoes publica o motor aqui
  // e a de leads o chama apos mover/criar lead (evita dependencia circular).
  const executeAutomationsRef = useRef<ExecuteAutomations | null>(null);

  const { timeline, setTimeline, addTimelineEvent } = useTimelineSlice(scope);

  const {
    pipelines, setPipelines, columns, setColumns, currentPipelineId, setCurrentPipelineId,
    addPipeline, updatePipeline, deletePipeline, addColumn, updateColumn, deleteColumn, reorderColumns,
  } = usePipelinesSlice(scope);

  const {
    tasks, setTasks, addTask, updateTask, deleteTask, completeTask, updateTaskResult, toggleTaskStatus,
  } = useTasksSlice({ scope, addTimelineEvent });

  const {
    leads, setLeads, leadCountByPipeline, setLeadCountByPipeline, leadsFetch,
    addLead, updateLead, deleteLead, moveLead, moveLeadToPipeline, mergeLeads,
  } = useLeadsSlice({ scope, columns, pipelines, addTimelineEvent, setTasks, executeAutomationsRef });

  const {
    automations, setAutomations, complexAutomations, setComplexAutomations,
    createAutomation, updateAutomationNodes, deleteAutomation, toggleComplexAutomation,
    toggleBasicAutomation, deleteBasicAutomation, addBasicAutomation, updateBasicAutomation,
  } = useAutomationsSlice({
    scope, currentPipelineId, leads, updateLead, addTask, moveLead, addTimelineEvent, executeAutomationsRef,
  });

  const { loading, fetchAll } = useAppDataLoader({
    scope, currentPipelineId,
    setPipelines, setCurrentPipelineId, setColumns, setTasks, setTimeline,
    setComplexAutomations, setAutomations, setLeads, setLeadCountByPipeline, leadsFetch,
  });

  const pipelinesValue = useMemo<PipelinesState>(() => ({
    pipelines, columns, currentPipelineId,
    setPipeline: setCurrentPipelineId, addPipeline, updatePipeline, deletePipeline,
    addColumn, updateColumn, deleteColumn, reorderColumns,
  }), [
    pipelines, columns, currentPipelineId, setCurrentPipelineId, addPipeline, updatePipeline, deletePipeline,
    addColumn, updateColumn, deleteColumn, reorderColumns,
  ]);

  const leadsValue = useMemo<LeadsState>(() => ({
    leads, leadCountByPipeline,
    addLead, updateLead, deleteLead, moveLead, moveLeadToPipeline, mergeLeads,
  }), [leads, leadCountByPipeline, addLead, updateLead, deleteLead, moveLead, moveLeadToPipeline, mergeLeads]);

  const tasksValue = useMemo<TasksState>(() => ({
    tasks, addTask, updateTask, deleteTask, toggleTaskStatus, completeTask, updateTaskResult,
  }), [tasks, addTask, updateTask, deleteTask, toggleTaskStatus, completeTask, updateTaskResult]);

  const automationsValue = useMemo<AutomationsState>(() => ({
    automations, complexAutomations,
    createAutomation, updateAutomationNodes, deleteAutomation, toggleComplexAutomation,
    toggleBasicAutomation, deleteBasicAutomation, addBasicAutomation, updateBasicAutomation,
  }), [
    automations, complexAutomations, createAutomation, updateAutomationNodes, deleteAutomation,
    toggleComplexAutomation, toggleBasicAutomation, deleteBasicAutomation, addBasicAutomation, updateBasicAutomation,
  ]);

  const timelineValue = useMemo<TimelineState>(() => ({ timeline, addTimelineEvent }), [timeline, addTimelineEvent]);

  const appDataValue = useMemo<AppDataState>(() => ({ loading, refreshData: fetchAll }), [loading, fetchAll]);

  return (
    <AppDataContext.Provider value={appDataValue}>
      <PipelinesContext.Provider value={pipelinesValue}>
        <LeadsContext.Provider value={leadsValue}>
          <TasksContext.Provider value={tasksValue}>
            <AutomationsContext.Provider value={automationsValue}>
              <TimelineContext.Provider value={timelineValue}>
                {children}
              </TimelineContext.Provider>
            </AutomationsContext.Provider>
          </TasksContext.Provider>
        </LeadsContext.Provider>
      </PipelinesContext.Provider>
    </AppDataContext.Provider>
  );
}
