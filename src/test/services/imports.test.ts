import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockSupabase } from "../helpers/supabaseMock";

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase.client }));
vi.mock("@/lib/supabase-untyped", () => ({
  untypedFrom: (t: string) => mockSupabase.client.from(t),
  untypedRpc: (fn: string, a?: Record<string, unknown>) => mockSupabase.client.rpc(fn, a),
}));

type Mod = typeof import("@/services/imports");
let m: Mod;

// As probes (hasImportBatchColumn / hasImportLogsTable) sao memoizadas no
// modulo; recarrega o modulo a cada teste para isolar o cache.
beforeEach(async () => {
  mockSupabase.reset();
  vi.resetModules();
  m = await import("@/services/imports");
});

const LOG_ROW = {
  client_id: "c-1",
  batch_id: "b-1",
  total_rows: 10,
  inserted: 8,
  skipped: 2,
  skipped_no_name: 1,
  skipped_duplicate: 1,
  errors: 0,
};

describe("services/imports - probes", () => {
  it("hasImportBatchColumn reflete a ausencia de erro e memoiza", async () => {
    mockSupabase.respond("leads", { data: [] });
    expect(await m.hasImportBatchColumn()).toBe(true);
    mockSupabase.respond("leads", { error: new Error("no col") });
    expect(await m.hasImportBatchColumn()).toBe(true); // cache
    expect(mockSupabase.queriesFor("leads")).toHaveLength(1);
  });

  it("hasImportBatchColumn e hasImportLogsTable dao false quando o schema nao existe", async () => {
    mockSupabase.respond("leads", { error: new Error("x") });
    mockSupabase.respond("import_logs", { error: new Error("x") });
    expect(await m.hasImportBatchColumn()).toBe(false);
    expect(await m.hasImportLogsTable()).toBe(false);
  });
});

describe("services/imports - insertImportLog", () => {
  it("e no-op quando import_logs nao existe", async () => {
    mockSupabase.respond("import_logs", { error: new Error("missing") });
    await m.insertImportLog(LOG_ROW);
    expect(mockSupabase.callsFor("import_logs").filter((c) => c[0] === "insert")).toEqual([]);
  });

  it("insere com updated=0 por padrao e preserva client_id", async () => {
    mockSupabase.respond("import_logs", { data: [] });
    await m.insertImportLog(LOG_ROW);
    expect(mockSupabase.callsFor("import_logs")).toContainEqual(["insert", { updated: 0, ...LOG_ROW }]);
  });

  it("updated informado sobrescreve o default", async () => {
    mockSupabase.respond("import_logs", { data: [] });
    await m.insertImportLog({ ...LOG_ROW, updated: 5 });
    const ins = mockSupabase.callsFor("import_logs").find((c) => c[0] === "insert");
    expect((ins?.[1] as { updated: number }).updated).toBe(5);
  });
});

describe("services/imports - listImportLogs", () => {
  it("devolve vazio sem consultar leads quando a tabela nao existe", async () => {
    mockSupabase.respond("import_logs", { error: new Error("missing") });
    expect(await m.listImportLogs("c-1", false, 0, 9)).toEqual({ rows: [], count: 0 });
  });

  it("filtra por client_id e pagina via range", async () => {
    mockSupabase.respond("import_logs", { data: [] }, { data: [{ id: "l1" }], count: 3 });
    const r = await m.listImportLogs("c-1", false, 10, 19);
    expect(r).toEqual({ rows: [{ id: "l1" }], count: 3 });
    const calls = mockSupabase.callsFor("import_logs");
    expect(calls).toContainEqual(["eq", "client_id", "c-1"]);
    expect(calls).toContainEqual(["range", 10, 19]);
  });

  it("masterView nao aplica filtro de client_id", async () => {
    mockSupabase.respond("import_logs", { data: [] }, { data: [{ id: "l1" }], count: 1 });
    await m.listImportLogs("c-1", true, 0, 9);
    expect(mockSupabase.callsFor("import_logs").filter((c) => c[0] === "eq")).toEqual([]);
  });

  it("propaga erro da consulta principal", async () => {
    mockSupabase.respond("import_logs", { data: [] }, { error: new Error("q") });
    await expect(m.listImportLogs("c-1", false, 0, 9)).rejects.toThrow("q");
  });

  it("count nulo vira 0 e rows nulo vira []", async () => {
    mockSupabase.respond("import_logs", { data: [] }, { data: null });
    expect(await m.listImportLogs("c-1", false, 0, 9)).toEqual({ rows: [], count: 0 });
  });
});

describe("services/imports - rollbackImportBatch", () => {
  it("conta, deleta e marca o log, sempre escopado por client_id e batch", async () => {
    mockSupabase.respond("leads", { count: 4 }, { error: null });
    expect(await m.rollbackImportBatch("b-1", "c-1")).toBe(4);
    const leads = mockSupabase.queriesFor("leads");
    expect(leads).toHaveLength(2);
    for (const q of leads) {
      expect(q).toContainEqual(["eq", "import_batch_id", "b-1"]);
      expect(q).toContainEqual(["eq", "client_id", "c-1"]);
    }
    expect(leads[1].map((c) => c[0])).toContain("delete");
    const log = mockSupabase.callsFor("import_logs");
    expect(log).toContainEqual(["eq", "batch_id", "b-1"]);
    expect(log).toContainEqual(["eq", "client_id", "c-1"]);
    const upd = log.find((c) => c[0] === "update");
    expect(typeof (upd?.[1] as { rolled_back_at: string }).rolled_back_at).toBe("string");
  });

  it("lanca quando o delete falha e nao marca o log", async () => {
    mockSupabase.respond("leads", { count: 4 }, { error: new Error("rls") });
    await expect(m.rollbackImportBatch("b-1", "c-1")).rejects.toThrow("rls");
    expect(mockSupabase.queriesFor("import_logs")).toHaveLength(0);
  });

  it("count nulo devolve 0", async () => {
    expect(await m.rollbackImportBatch("b-1", "c-1")).toBe(0);
  });
});

describe("services/imports - loadExistingContactKeys", () => {
  it("normaliza telefones e emails e filtra por client_id", async () => {
    mockSupabase.respond("leads", {
      data: [
        { phone: "(11) 91234-5678", email: " Foo@Bar.COM " },
        { phone: null, email: null },
      ],
    });
    const { phones, emails } = await m.loadExistingContactKeys("c-1");
    expect(phones).toEqual(new Set(["1112345678"]));
    expect(emails).toEqual(new Set(["foo@bar.com"]));
    expect(mockSupabase.callsFor("leads")).toContainEqual(["eq", "client_id", "c-1"]);
  });

  it("pagina de 1000 em 1000 ate uma pagina incompleta", async () => {
    const full = Array.from({ length: 1000 }, (_, i) => ({ phone: null, email: `u${i}@x.com` }));
    mockSupabase.respond("leads", { data: full }, { data: [{ phone: null, email: "last@x.com" }] });
    const { emails } = await m.loadExistingContactKeys("c-1");
    expect(emails.size).toBe(1001);
    const calls = mockSupabase.callsFor("leads");
    expect(calls).toContainEqual(["range", 0, 999]);
    expect(calls).toContainEqual(["range", 1000, 1999]);
    expect(mockSupabase.queriesFor("leads")).toHaveLength(2);
  });

  it("em erro para de paginar e devolve o que ja carregou (sem lancar)", async () => {
    mockSupabase.respond("leads", { error: new Error("x") });
    const r = await m.loadExistingContactKeys("c-1");
    expect(r.phones.size).toBe(0);
    expect(r.emails.size).toBe(0);
  });
});

describe("services/imports - loadExistingLeadsIndex", () => {
  it("indexa por telefone e email, mantendo o primeiro em caso de duplicata", async () => {
    mockSupabase.respond("leads", {
      data: [
        { id: "1", phone: "11912345678", email: "A@x.com" },
        { id: "2", phone: "(11) 1234-5678", email: "a@x.com" },
        { id: "3", phone: null, email: null },
      ],
    });
    const { byPhone, byEmail } = await m.loadExistingLeadsIndex("c-1");
    expect(byPhone.size).toBe(1);
    expect(byPhone.get("1112345678")?.id).toBe("1");
    expect(byEmail.get("a@x.com")?.id).toBe("1");
    expect(mockSupabase.callsFor("leads")).toContainEqual(["eq", "client_id", "c-1"]);
  });

  it("devolve mapas vazios quando nao ha linhas", async () => {
    const r = await m.loadExistingLeadsIndex("c-1");
    expect(r.byPhone.size + r.byEmail.size).toBe(0);
  });
});

describe("services/imports - listLeadsByBatch", () => {
  it("filtra por batch e client_id", async () => {
    mockSupabase.respond("leads", { data: [{ id: "1" }] });
    expect(await m.listLeadsByBatch("b-1", "c-1")).toEqual([{ id: "1" }]);
    const calls = mockSupabase.callsFor("leads");
    expect(calls).toContainEqual(["eq", "import_batch_id", "b-1"]);
    expect(calls).toContainEqual(["eq", "client_id", "c-1"]);
  });

  it("propaga erro e devolve [] com data nulo", async () => {
    expect(await m.listLeadsByBatch("b", "c")).toEqual([]);
    mockSupabase.respond("leads", { error: new Error("e") });
    await expect(m.listLeadsByBatch("b", "c")).rejects.toThrow("e");
  });
});
