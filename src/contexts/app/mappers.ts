import type {
  Lead,
  Pipeline,
  PipelineColumn,
  Task,
  Automation,
  AutomationTrigger,
  AutomationAction,
  AutomationException,
  TimelineEvent,
  ComplexAutomation,
} from "@/types";

// Mappers de linhas do banco para os tipos de dominio do app.
// Funcoes puras: sem estado, sem efeitos colaterais.

export function mapPipeline(row: Record<string, unknown>): Pipeline {
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    name: row.name as string,
    columns: [],
  };
}

export function mapColumn(row: Record<string, unknown>): PipelineColumn {
  return {
    id: row.id as string,
    pipeline_id: row.pipeline_id as string,
    name: row.name as string,
    order: row.order as number,
    color: (row.color as string) || undefined,
    description: (row.description as string) || undefined,
  };
}

export function mapLead(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    name: row.name as string,
    phone: (row.phone as string) || undefined,
    email: (row.email as string) || undefined,
    company: (row.company as string) || undefined,
    position: (row.position as string) || undefined,
    city: (row.city as string) || undefined,
    notes: (row.notes as string) || undefined,
    notes_local: (row.notes_local as string) || undefined,
    custom_fields: (row.custom_fields as Lead["custom_fields"]) || {},
    origin: (row.origin as string) || undefined,
    category: (row.category as "lead" | "partner" | "collaborator") || "lead",
    tags: (row.tags as string[]) || [],
    column_id: row.column_id as string,
    responsible_id: (row.responsible_id as string) || undefined,
    value: (row.value as number) || undefined,
    segmento: (row.segmento as string) || undefined,
    faturamento_mensal: (row.faturamento_mensal as number) || undefined,
    utm_source: (row.utm_source as string) || undefined,
    utm_medium: (row.utm_medium as string) || undefined,
    utm_campaign: (row.utm_campaign as string) || undefined,
    utm_content: (row.utm_content as string) || undefined,
    utm_term: (row.utm_term as string) || undefined,
    ad_campaign_id: (row.ad_campaign_id as string) || undefined,
    ad_adset_id: (row.ad_adset_id as string) || undefined,
    ad_id: (row.ad_id as string) || undefined,
    fbclid: (row.fbclid as string) || undefined,
    gclid: (row.gclid as string) || undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function mapTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    lead_id: (row.lead_id as string) || undefined,
    title: row.title as string,
    description: (row.description as string) || undefined,
    status: row.status as Task["status"],
    priority: (row.priority as Task["priority"]) || undefined,
    due_date: (row.due_date as string) || undefined,
    assigned_to: (row.assigned_to as string) || undefined,
    assigned_to_id: (row.assigned_to_id as string) || undefined,
    created_at: row.created_at as string,
    result: (row.result as string) || undefined,
    completed_at: (row.completed_at as string) || undefined,
  };
}

export function mapTimeline(row: Record<string, unknown>): TimelineEvent {
  return {
    id: row.id as string,
    lead_id: row.lead_id as string,
    type: row.type as TimelineEvent["type"],
    content: row.content as string,
    created_at: row.created_at as string,
    user_name: (row.user_name as string) || undefined,
    user_id: (row.user_id as string) || undefined,
  };
}

export function mapComplexAutomation(row: Record<string, unknown>): ComplexAutomation {
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    name: row.name as string,
    status: row.status as string,
    trigger_type: row.trigger_type as string | undefined,
    nodes: Array.isArray(row.nodes) ? row.nodes : [],
    edges: Array.isArray(row.edges) ? row.edges : [],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function mapAutomationRule(row: Record<string, unknown>): Automation {
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    pipeline_id: row.pipeline_id as string || undefined,
    column_id: row.column_id as string || undefined,
    name: row.name as string,
    active: row.active as boolean,
    trigger: (row.trigger as AutomationTrigger) || { type: "card_entered" },
    actions: (row.actions as AutomationAction[]) || [],
    exceptions: (row.exceptions as AutomationException[]) || [],
  };
}
