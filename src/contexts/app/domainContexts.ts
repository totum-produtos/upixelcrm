import { createContext, useContext } from "react";
import type {
  AppDataState, AutomationsState, LeadsState, PipelinesState, TasksState, TimelineState,
} from "@/contexts/app/types";

// Um contexto por dominio. Cada valor e memoizado no AppProvider, entao quem
// usa um hook estreito so re-renderiza quando o proprio dominio muda.

export const PipelinesContext = createContext<PipelinesState | null>(null);
export const LeadsContext = createContext<LeadsState | null>(null);
export const TasksContext = createContext<TasksState | null>(null);
export const AutomationsContext = createContext<AutomationsState | null>(null);
export const TimelineContext = createContext<TimelineState | null>(null);
export const AppDataContext = createContext<AppDataState | null>(null);

function useRequiredContext<T>(ctx: T | null, hookName: string): T {
  if (!ctx) throw new Error(`${hookName} must be used within AppProvider`);
  return ctx;
}

/** Funis, colunas e funil selecionado. */
export function usePipelinesState(): PipelinesState {
  return useRequiredContext(useContext(PipelinesContext), "usePipelinesState");
}

/** Leads e suas acoes (criar, editar, mover, excluir, mesclar). */
export function useLeadsState(): LeadsState {
  return useRequiredContext(useContext(LeadsContext), "useLeadsState");
}

/** Tarefas e suas acoes. */
export function useTasksState(): TasksState {
  return useRequiredContext(useContext(TasksContext), "useTasksState");
}

/** Regras basicas e fluxos complexos de automacao. */
export function useAutomationsState(): AutomationsState {
  return useRequiredContext(useContext(AutomationsContext), "useAutomationsState");
}

/** Eventos da timeline dos leads. */
export function useTimelineState(): TimelineState {
  return useRequiredContext(useContext(TimelineContext), "useTimelineState");
}

/** Flag de loading e recarga manual dos dados. */
export function useAppDataState(): AppDataState {
  return useRequiredContext(useContext(AppDataContext), "useAppDataState");
}
