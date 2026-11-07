import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Node, Edge } from "reactflow";
import type { Lead, Pipeline, PipelineColumn, Task, Automation, TimelineEvent, ComplexAutomation } from "@/types";

/** Forma completa devolvida por `useAppState()`. Nao alterar sem revisar os consumidores. */
export interface AppState {
  leads: Lead[];
  pipelines: Pipeline[];
  columns: PipelineColumn[];
  currentPipelineId: string;
  tasks: Task[];
  automations: Automation[];
  complexAutomations: ComplexAutomation[];
  timeline: TimelineEvent[];
  leadCountByPipeline: Record<string, number>;
  loading: boolean;

  setPipeline: (id: string) => void;
  addPipeline: (name: string) => Promise<void>;
  addLead: (data: Partial<Lead>, columnId: string) => Promise<Lead | null>;
  /** UI-PATTERNS: retorna false em erro para o modal decidir se fecha. */
  updateLead: (id: string, data: Partial<Lead>) => Promise<boolean>;
  deleteLead: (id: string) => Promise<void>;
  /** UI-PATTERNS: retorna false em erro para o modal decidir se fecha. */
  moveLead: (id: string, toColumnId: string) => Promise<boolean>;
  moveLeadToPipeline: (id: string, toPipelineId: string) => Promise<void>;
  mergeLeads: (sourceLeadId: string, targetLeadId: string) => Promise<void>;

  addTask: (data: Partial<Task>) => Promise<Task | null>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskStatus: (id: string) => Promise<void>;
  /** 2.6: conclui uma tarefa pendente, gravando o resultado. Retorna false em erro. */
  completeTask: (id: string, result?: string) => Promise<boolean>;
  /** 2.6: edita o resultado de uma tarefa já concluída, sem mexer em status/completed_at. */
  updateTaskResult: (id: string, result?: string) => Promise<boolean>;

  addColumn: (name: string, color: string) => Promise<void>;
  /** UI-PATTERNS: retorna false em erro para o modal decidir se fecha. */
  updateColumn: (id: string, data: Partial<PipelineColumn>) => Promise<boolean>;
  /** UI-PATTERNS: retorna false em erro para o modal decidir se fecha. */
  deleteColumn: (id: string) => Promise<boolean>;
  reorderColumns: (orderedIds: string[]) => Promise<void>;

  addTimelineEvent: (event: Omit<TimelineEvent, "id" | "created_at">) => Promise<void>;

  createAutomation: (name: string) => Promise<string | null>;
  updateAutomationNodes: (id: string, nodes: Node[], edges: Edge[]) => Promise<void>;
  deleteAutomation: (id: string) => Promise<void>;
  toggleComplexAutomation: (id: string) => Promise<void>;

  toggleBasicAutomation: (id: string) => Promise<void>;
  deleteBasicAutomation: (id: string) => Promise<void>;
  addBasicAutomation: (data: Partial<Automation>) => Promise<void>;
  updateBasicAutomation: (id: string, data: Partial<Automation>) => Promise<void>;

  updatePipeline: (id: string, data: Partial<Pipeline>) => Promise<void>;
  deletePipeline: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

/**
 * Escopo de tenant/usuario compartilhado pelas fatias do provider.
 * Expoe so primitivos (e o objeto memoizado de insert) para que as dependencias
 * dos useCallback das fatias continuem identicas as do provider original.
 */
export interface AppScope {
  tenantId: string | undefined;
  userClientId: string | undefined;
  userId: string | undefined;
  isMasterView: boolean;
  /** `{ tenant_id }` quando o tenant tem UUID valido, `{}` caso contrario (master view). */
  tenantIdForInsert: { tenant_id?: string };
}

export type AddTimelineEvent = AppState["addTimelineEvent"];

/** Tipos de gatilho aceitos pelo motor: os das regras basicas mais "new_lead" (addLead). */
export type EngineTriggerType = Automation["trigger"]["type"] | "new_lead";

export type ExecuteAutomations = (
  leadId: string,
  triggerType: EngineTriggerType,
  columnId?: string,
) => Promise<void>;

export type ExecuteAutomationsRef = MutableRefObject<ExecuteAutomations | null>;

export type StateSetter<T> = Dispatch<SetStateAction<T>>;
