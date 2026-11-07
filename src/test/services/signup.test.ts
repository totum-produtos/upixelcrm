import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockSupabase } from "../helpers/supabaseMock";

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase.client }));
vi.mock("@/lib/supabase-untyped", () => ({
  untypedFrom: (t: string) => mockSupabase.client.from(t),
  untypedRpc: (fn: string, a?: Record<string, unknown>) => mockSupabase.client.rpc(fn, a),
}));

import {
  isSubdomainTaken,
  createTenant,
  createTenantOrganization,
  deleteTenant,
  checkSignupGate,
  notifySignup,
  provisionTenantDomain,
} from "@/services/signup";

beforeEach(() => mockSupabase.reset());

describe("services/signup", () => {
  it("isSubdomainTaken consulta tenants e organizations pelo subdominio", async () => {
    await isSubdomainTaken("acme");
    expect(mockSupabase.callsFor("tenants")).toContainEqual(["eq", "subdomain", "acme"]);
    expect(mockSupabase.callsFor("organizations")).toContainEqual(["eq", "subdomain", "acme"]);
  });

  it("isSubdomainTaken e true se existir em tenants OU em organizations", async () => {
    mockSupabase.respond("tenants", { data: { id: "t" } });
    expect(await isSubdomainTaken("a")).toBe(true);
    mockSupabase.reset();
    mockSupabase.respond("organizations", { data: { id: "o" } });
    expect(await isSubdomainTaken("a")).toBe(true);
  });

  it("isSubdomainTaken trata erro como disponivel e livre como false", async () => {
    mockSupabase.respond("tenants", { error: new Error("x") });
    mockSupabase.respond("organizations", { error: new Error("y") });
    expect(await isSubdomainTaken("a")).toBe(false);
  });

  it("createTenant insere com owner_id e devolve o id", async () => {
    mockSupabase.respond("tenants", { data: { id: "t-9" } });
    expect(await createTenant("Acme", "acme", "u1")).toBe("t-9");
    expect(mockSupabase.callsFor("tenants")).toContainEqual([
      "insert", { name: "Acme", subdomain: "acme", owner_id: "u1" },
    ]);
  });

  it("createTenant lanca erro do banco e erro generico sem dados", async () => {
    mockSupabase.respond("tenants", { error: new Error("dup") }, { data: null });
    await expect(createTenant("A", "a", "u")).rejects.toThrow("dup");
    await expect(createTenant("A", "a", "u")).rejects.toThrow("Erro ao reservar subdomínio.");
  });

  it("createTenantOrganization insere vinculando tenant_id e devolve o id", async () => {
    const row = { name: "A", slug: "a", subdomain: "a", tenant_id: "t1", owner_id: "u1" };
    mockSupabase.respond("organizations", { data: { id: "o-1" } });
    expect(await createTenantOrganization(row)).toBe("o-1");
    expect(mockSupabase.callsFor("organizations")).toContainEqual(["insert", row]);
  });

  it("createTenantOrganization lanca em erro e sem dados", async () => {
    const row = { name: "A", slug: "a", subdomain: "a", tenant_id: "t1", owner_id: "u1" };
    mockSupabase.respond("organizations", { error: new Error("rls") }, { data: null });
    await expect(createTenantOrganization(row)).rejects.toThrow("rls");
    await expect(createTenantOrganization(row)).rejects.toThrow("Erro ao criar organização.");
  });

  it("deleteTenant remove apenas o tenant do id e propaga erro", async () => {
    await deleteTenant("t1");
    const calls = mockSupabase.callsFor("tenants");
    expect(calls).toContainEqual(["delete"]);
    expect(calls).toContainEqual(["eq", "id", "t1"]);
    mockSupabase.respond("tenants", { error: new Error("del") });
    await expect(deleteTenant("t1")).rejects.toThrow("del");
  });

  it("checkSignupGate envia a senha e interpreta ok", async () => {
    mockSupabase.respondInvoke("check-signup-gate", { data: { ok: true } }, { data: { ok: false } }, { data: null });
    expect(await checkSignupGate("pw")).toBe(true);
    expect(await checkSignupGate("pw")).toBe(false);
    expect(await checkSignupGate("pw")).toBe(false);
    expect(mockSupabase.invokeCalls()[0]).toEqual({ fn: "check-signup-gate", options: { body: { password: "pw" } } });
  });

  it("checkSignupGate trata erro da edge como senha incorreta", async () => {
    mockSupabase.respondInvoke("check-signup-gate", { data: { ok: true }, error: new Error("net") });
    expect(await checkSignupGate("pw")).toBe(false);
  });

  it("notifySignup e provisionTenantDomain invocam as edges certas", async () => {
    const body = { tenantId: "t", tenantName: "T", subdomain: "s", ownerEmail: "e", ownerName: "o" };
    await notifySignup(body);
    await provisionTenantDomain("acme");
    expect(mockSupabase.invokeCalls()).toEqual([
      { fn: "notify-signup", options: { body } },
      { fn: "tenant-provision-domain", options: { body: { subdomain: "acme" } } },
    ]);
  });
});
