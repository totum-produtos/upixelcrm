/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useRef, type ReactNode } from "react";
import { useAppScope } from "@/contexts/app/useAppScope";
import { useTimelineSlice } from "@/contexts/app/useTimelineSlice";
import { usePipelinesSlice } from "@/contexts/app/usePipelinesSlice";
import { useTasksSlice } from "@/contexts/app/useTasksSlice";
import { useLeadsSlice } from "@/contexts/app/useLeadsSlice";
import { useAutomationsSlice } from "@/contexts/app/useAutomationsSlice";
import { useAppDataLoader } from "@/contexts/app/useAppDataLoader";
import type { AppState, ExecuteAutomations } from "@/contexts/app/types";

const AppContext = createContext<AppState | null>(null);

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
}

/**
 * Provider unico do CRM. O estado e as acoes vivem em fatias por dominio
 * (src/contexts/app/*); aqui elas sao compostas e as operacoes que cruzam
 * dominios recebem explicitamente o que precisam (setters, motor de automacoes).
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

  return (
    <AppContext.Provider value={{
      leads, pipelines, columns, currentPipelineId, tasks, automations, complexAutomations, timeline, loading,
      leadCountByPipeline,
      setPipeline: setCurrentPipelineId, addPipeline, updatePipeline, deletePipeline,
      addLead, updateLead, deleteLead, moveLead, moveLeadToPipeline,
      addTask, updateTask, deleteTask, toggleTaskStatus, completeTask, updateTaskResult,
      addColumn, updateColumn, deleteColumn, reorderColumns, addTimelineEvent,
      createAutomation, updateAutomationNodes, deleteAutomation, toggleComplexAutomation,
      toggleBasicAutomation, deleteBasicAutomation, addBasicAutomation, updateBasicAutomation,
      refreshData: fetchAll,
      mergeLeads
    }}>
      {children}
    </AppContext.Provider>
  );
}
