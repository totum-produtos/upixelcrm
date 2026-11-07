import { describe, it, expect } from "vitest";
import {
  mapPipeline,
  mapColumn,
  mapLead,
  mapTask,
  mapTimeline,
  mapComplexAutomation,
  mapAutomationRule,
} from "@/contexts/app/mappers";

describe("mapPipeline", () => {
  it("copia id, client_id e name e inicia colunas vazias", () => {
    expect(mapPipeline({ id: "p1", client_id: "c1", name: "Vendas", extra: "ignorado" })).toEqual({
      id: "p1", client_id: "c1", name: "Vendas", columns: [],
    });
  });
});

describe("mapColumn", () => {
  it("mantem order 0 e converte color/description vazios em undefined", () => {
    expect(mapColumn({ id: "c1", pipeline_id: "p1", name: "Novos", order: 0, color: "", description: null })).toEqual({
      id: "c1", pipeline_id: "p1", name: "Novos", order: 0, color: undefined, description: undefined,
    });
  });

  it("preserva color e description preenchidos", () => {
    const col = mapColumn({ id: "c1", pipeline_id: "p1", name: "N", order: 2, color: "#fff", description: "d" });
    expect(col.color).toBe("#fff");
    expect(col.description).toBe("d");
    expect(col.order).toBe(2);
  });
});

describe("mapLead", () => {
  it("aplica defaults para campos ausentes", () => {
    const lead = mapLead({ id: "l1", client_id: "c1", name: "Ana", column_id: "col1", created_at: "t1", updated_at: "t2" });
    expect(lead.category).toBe("lead");
    expect(lead.tags).toEqual([]);
    expect(lead.custom_fields).toEqual({});
    expect(lead.phone).toBeUndefined();
    expect(lead.value).toBeUndefined();
    expect(lead.created_at).toBe("t1");
    expect(lead.updated_at).toBe("t2");
  });

  it("converte valores falsy (null, vazio, 0) em undefined", () => {
    const lead = mapLead({
      id: "l1", client_id: "c1", name: "Ana", column_id: "col1",
      phone: "", email: null, value: 0, faturamento_mensal: 0, utm_source: "",
    });
    expect(lead.phone).toBeUndefined();
    expect(lead.email).toBeUndefined();
    expect(lead.value).toBeUndefined();
    expect(lead.faturamento_mensal).toBeUndefined();
    expect(lead.utm_source).toBeUndefined();
  });

  it("preserva campos preenchidos", () => {
    const lead = mapLead({
      id: "l1", client_id: "c1", name: "Ana", column_id: "col1",
      phone: "11999", email: "a@a.com", company: "ACME", position: "CEO", city: "SP",
      notes: "n", notes_local: "nl", custom_fields: { a: 1 }, origin: "Site", category: "partner",
      tags: ["x", "y"], responsible_id: "u1", value: 100, segmento: "Varejo", faturamento_mensal: 5000,
      utm_source: "g", utm_medium: "cpc", utm_campaign: "c", utm_content: "ct", utm_term: "t",
      ad_campaign_id: "ac", ad_adset_id: "as", ad_id: "ad", fbclid: "fb", gclid: "gc",
      created_at: "t1", updated_at: "t2",
    });
    expect(lead).toEqual({
      id: "l1", client_id: "c1", name: "Ana", phone: "11999", email: "a@a.com", company: "ACME",
      position: "CEO", city: "SP", notes: "n", notes_local: "nl", custom_fields: { a: 1 }, origin: "Site",
      category: "partner", tags: ["x", "y"], column_id: "col1", responsible_id: "u1", value: 100,
      segmento: "Varejo", faturamento_mensal: 5000, utm_source: "g", utm_medium: "cpc", utm_campaign: "c",
      utm_content: "ct", utm_term: "t", ad_campaign_id: "ac", ad_adset_id: "as", ad_id: "ad",
      fbclid: "fb", gclid: "gc", created_at: "t1", updated_at: "t2",
    });
  });
});

describe("mapTask", () => {
  it("mapeia campos e converte vazios em undefined", () => {
    const task = mapTask({
      id: "t1", client_id: "c1", lead_id: null, title: "Ligar", status: "pending",
      description: "", priority: null, due_date: null, created_at: "t1",
    });
    expect(task).toEqual({
      id: "t1", client_id: "c1", lead_id: undefined, title: "Ligar", description: undefined,
      status: "pending", priority: undefined, due_date: undefined, assigned_to: undefined,
      assigned_to_id: undefined, created_at: "t1", result: undefined, completed_at: undefined,
    });
  });

  it("preserva campos preenchidos, incluindo resultado e conclusao", () => {
    const task = mapTask({
      id: "t1", client_id: "c1", lead_id: "l1", title: "Ligar", status: "completed", priority: "high",
      due_date: "2026-01-02", assigned_to: "Ana", assigned_to_id: "u1", created_at: "t1",
      result: "ok", completed_at: "t3", description: "d",
    });
    expect(task.status).toBe("completed");
    expect(task.priority).toBe("high");
    expect(task.result).toBe("ok");
    expect(task.completed_at).toBe("t3");
    expect(task.lead_id).toBe("l1");
    expect(task.assigned_to_id).toBe("u1");
  });
});

describe("mapTimeline", () => {
  it("mapeia o evento e converte user vazio em undefined", () => {
    expect(mapTimeline({ id: "e1", lead_id: "l1", type: "note", content: "x", created_at: "t", user_name: "", user_id: null })).toEqual({
      id: "e1", lead_id: "l1", type: "note", content: "x", created_at: "t", user_name: undefined, user_id: undefined,
    });
  });

  it("preserva user_name e user_id", () => {
    const ev = mapTimeline({ id: "e1", lead_id: "l1", type: "task", content: "x", created_at: "t", user_name: "Ana", user_id: "u1" });
    expect(ev.user_name).toBe("Ana");
    expect(ev.user_id).toBe("u1");
  });
});

describe("mapComplexAutomation", () => {
  it("usa arrays vazios quando nodes/edges nao sao arrays", () => {
    const auto = mapComplexAutomation({
      id: "a1", client_id: "c1", name: "Fluxo", status: "draft", nodes: null, edges: "invalido",
      created_at: "t1", updated_at: "t2",
    });
    expect(auto.nodes).toEqual([]);
    expect(auto.edges).toEqual([]);
    expect(auto.trigger_type).toBeUndefined();
  });

  it("preserva nodes, edges e trigger_type", () => {
    const nodes = [{ id: "n1", type: "trigger", position: { x: 0, y: 0 }, data: {} }];
    const edges = [{ id: "e1", source: "n1", target: "n2" }];
    const auto = mapComplexAutomation({
      id: "a1", client_id: "c1", name: "Fluxo", status: "active", trigger_type: "new_lead",
      nodes, edges, created_at: "t1", updated_at: "t2",
    });
    expect(auto).toEqual({
      id: "a1", client_id: "c1", name: "Fluxo", status: "active", trigger_type: "new_lead",
      nodes, edges, created_at: "t1", updated_at: "t2",
    });
  });
});

describe("mapAutomationRule", () => {
  it("aplica defaults de trigger, actions e exceptions", () => {
    const rule = mapAutomationRule({ id: "r1", client_id: "c1", name: "Regra", active: true, pipeline_id: null, column_id: "" });
    expect(rule).toEqual({
      id: "r1", client_id: "c1", pipeline_id: undefined, column_id: undefined, name: "Regra", active: true,
      trigger: { type: "card_entered" }, actions: [], exceptions: [],
    });
  });

  it("preserva trigger, actions e exceptions informados", () => {
    const trigger = { type: "stage_changed" };
    const actions = [{ type: "add_tag", config: { tag: "x" } }];
    const exceptions = [{ type: "has_tag", config: { tag: "y" } }];
    const rule = mapAutomationRule({
      id: "r1", client_id: "c1", pipeline_id: "p1", column_id: "col1", name: "Regra", active: false,
      trigger, actions, exceptions,
    });
    expect(rule).toEqual({
      id: "r1", client_id: "c1", pipeline_id: "p1", column_id: "col1", name: "Regra", active: false,
      trigger, actions, exceptions,
    });
  });
});
