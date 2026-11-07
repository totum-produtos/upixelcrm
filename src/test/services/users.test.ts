import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockSupabase } from "../helpers/supabaseMock";

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase.client }));
vi.mock("@/lib/supabase-untyped", () => ({
  untypedFrom: (t: string) => mockSupabase.client.from(t),
  untypedRpc: (fn: string, a?: Record<string, unknown>) => mockSupabase.client.rpc(fn, a),
}));

import {
  getProfileById,
  ensureOwnProfile,
  getProfileClientId,
  listClientMembers,
  listActiveAgents,
  updateProfileName,
  insertNotifications,
  listNotifications,
  markAllNotificationsRead,
  upsertPushSubscription,
  listProfilesForAdmin,
  listAuditLogs,
  insertAuditLog,
  setUserBlocked,
  setUserRole,
  adminDeleteUser,
  adminAddOrgMember,
  deleteOrganization,
  getProfileOrganizationId,
  getOrganizationById,
  listOrgMembers,
  insertOrganization,
  setProfileOrganization,
  findProfileBasicsByEmail,
  ownerAddOrgMember,
  invokeAdminCreateUser,
} from "@/services/users";

beforeEach(() => mockSupabase.reset());

describe("services/users - perfil", () => {
  it("getProfileById devolve null em erro ou ausente e o perfil quando existe", async () => {
    mockSupabase.respond("profiles", { error: new Error("x") }, { data: null }, { data: { id: "u1" } });
    expect(await getProfileById("u1")).toBeNull();
    expect(await getProfileById("u1")).toBeNull();
    expect(await getProfileById("u1")).toEqual({ id: "u1" });
    expect(mockSupabase.callsFor("profiles")).toContainEqual(["eq", "id", "u1"]);
  });

  it("ensureOwnProfile chama o rpc e propaga erro", async () => {
    await ensureOwnProfile();
    expect(mockSupabase.rpcCalls()[0].fn).toBe("ensure_own_profile");
    mockSupabase.respondRpc("ensure_own_profile", { error: new Error("rpc") });
    await expect(ensureOwnProfile()).rejects.toThrow("rpc");
  });

  it("getProfileClientId devolve client_id, null sem perfil e lança em erro", async () => {
    mockSupabase.respond("profiles", { data: { client_id: "c1" } }, { data: null }, { error: new Error("e") });
    expect(await getProfileClientId("u1")).toBe("c1");
    expect(await getProfileClientId("u1")).toBeNull();
    await expect(getProfileClientId("u1")).rejects.toThrow("e");
  });

  it("listClientMembers filtra por client_id e propaga erro", async () => {
    mockSupabase.respond("profiles", { data: [{ id: "a", name: "A", email: null }] });
    expect(await listClientMembers("c1")).toHaveLength(1);
    expect(mockSupabase.callsFor("profiles")).toContainEqual(["eq", "client_id", "c1"]);
    mockSupabase.respond("profiles", { error: new Error("boom") });
    await expect(listClientMembers("c1")).rejects.toThrow("boom");
  });

  it("listActiveAgents filtra tenant, exclui bloqueados e deduplica masters", async () => {
    mockSupabase.respond(
      "profiles",
      { data: [{ id: "a", name: "A" }, { id: "m", name: "M" }] },
      { data: [{ id: "m", name: "M" }, { id: "m2", name: "M2" }] }
    );
    const agents = await listActiveAgents("c1");
    expect(agents.map((a) => a.id)).toEqual(["a", "m", "m2"]);
    const [tenantQ, masterQ] = mockSupabase.queriesFor("profiles");
    expect(tenantQ).toContainEqual(["eq", "client_id", "c1"]);
    expect(tenantQ).toContainEqual(["eq", "is_blocked", false]);
    expect(masterQ).toContainEqual(["eq", "role", "master"]);
    expect(masterQ).toContainEqual(["not", "id", "in", "(a,m)"]);
  });

  it("listActiveAgents usa uuid nulo quando o tenant nao tem perfis e lanca em erro", async () => {
    mockSupabase.respond("profiles", { data: [] });
    await listActiveAgents("c1");
    const masterQ = mockSupabase.queriesFor("profiles")[1];
    expect(masterQ).toContainEqual(["not", "id", "in", "(00000000-0000-0000-0000-000000000000)"]);
    mockSupabase.reset();
    mockSupabase.respond("profiles", { error: new Error("fail") });
    await expect(listActiveAgents("c1")).rejects.toThrow("fail");
  });

  it("updateProfileName atualiza pelo id e propaga erro", async () => {
    await updateProfileName("u1", "Novo");
    const calls = mockSupabase.callsFor("profiles");
    expect(calls).toContainEqual(["update", { name: "Novo" }]);
    expect(calls).toContainEqual(["eq", "id", "u1"]);
    mockSupabase.respond("profiles", { error: new Error("no") });
    await expect(updateProfileName("u1", "x")).rejects.toThrow("no");
  });
});

describe("services/users - notificacoes e push", () => {
  it("insertNotifications insere as linhas e propaga erro", async () => {
    const rows = [{ user_id: "u1", title: "t" }] as never;
    await insertNotifications(rows);
    expect(mockSupabase.callsFor("notifications")).toContainEqual(["insert", rows]);
    mockSupabase.respond("notifications", { error: new Error("n") });
    await expect(insertNotifications(rows)).rejects.toThrow("n");
  });

  it("listNotifications filtra por user_id, aplica limit e devolve [] sem dados", async () => {
    expect(await listNotifications("u1", 5)).toEqual([]);
    const calls = mockSupabase.callsFor("notifications");
    expect(calls).toContainEqual(["eq", "user_id", "u1"]);
    expect(calls).toContainEqual(["limit", 5]);
  });

  it("markAllNotificationsRead so atualiza as nao lidas do usuario", async () => {
    await markAllNotificationsRead("u1");
    const calls = mockSupabase.callsFor("notifications");
    expect(calls).toContainEqual(["update", { read: true }]);
    expect(calls).toContainEqual(["eq", "user_id", "u1"]);
    expect(calls).toContainEqual(["eq", "read", false]);
  });

  it("upsertPushSubscription usa onConflict user_id,endpoint e propaga erro", async () => {
    const row = { user_id: "u1", endpoint: "e" } as never;
    await upsertPushSubscription(row);
    expect(mockSupabase.callsFor("push_subscriptions")).toContainEqual([
      "upsert", row, { onConflict: "user_id,endpoint" },
    ]);
    mockSupabase.respond("push_subscriptions", { error: new Error("p") });
    await expect(upsertPushSubscription(row)).rejects.toThrow("p");
  });
});

describe("services/users - administracao", () => {
  it("listProfilesForAdmin prioriza tenantId, depois organizationId, depois selfId", async () => {
    await listProfilesForAdmin({ tenantId: "t1", organizationId: "o1" });
    expect(mockSupabase.callsFor("profiles")).toContainEqual(["eq", "tenant_id", "t1"]);
    expect(mockSupabase.callsFor("profiles")).not.toContainEqual(["eq", "organization_id", "o1"]);
    mockSupabase.reset();
    await listProfilesForAdmin({ organizationId: "o1" });
    expect(mockSupabase.callsFor("profiles")).toContainEqual(["eq", "organization_id", "o1"]);
    mockSupabase.reset();
    await listProfilesForAdmin({ selfId: "u1" });
    expect(mockSupabase.callsFor("profiles")).toContainEqual(["eq", "id", "u1"]);
  });

  it("listProfilesForAdmin sem filtro nao aplica eq (visao master) e propaga erro", async () => {
    await listProfilesForAdmin();
    expect(mockSupabase.callsFor("profiles").filter((c) => c[0] === "eq")).toEqual([]);
    mockSupabase.respond("profiles", { error: new Error("adm") });
    await expect(listProfilesForAdmin()).rejects.toThrow("adm");
  });

  it("listAuditLogs filtra por tenant_id quando informado e respeita o limit", async () => {
    mockSupabase.respond("audit_log", { data: [{ id: 1 }] });
    expect(await listAuditLogs("t1", 10)).toEqual([{ id: 1 }]);
    const calls = mockSupabase.callsFor("audit_log");
    expect(calls).toContainEqual(["eq", "tenant_id", "t1"]);
    expect(calls).toContainEqual(["limit", 10]);
  });

  it("listAuditLogs sem tenant nao filtra (todos os logs)", async () => {
    await listAuditLogs();
    expect(mockSupabase.callsFor("audit_log").filter((c) => c[0] === "eq")).toEqual([]);
  });

  it("insertAuditLog insere a linha com tenant_id e propaga erro", async () => {
    const row = { user_name: "x", action: "a", details: null, tenant_id: "t1" };
    await insertAuditLog(row);
    expect(mockSupabase.callsFor("audit_log")).toContainEqual(["insert", row]);
    mockSupabase.respond("audit_log", { error: new Error("al") });
    await expect(insertAuditLog(row)).rejects.toThrow("al");
  });

  it("setUserBlocked escolhe o rpc conforme master/supervisor", async () => {
    await setUserBlocked(true, "u2", true);
    await setUserBlocked(false, "u2", false);
    const calls = mockSupabase.rpcCalls();
    expect(calls[0]).toEqual({ fn: "admin_toggle_block", args: { target_user_id: "u2", block_status: true } });
    expect(calls[1]).toEqual({ fn: "supervisor_toggle_block", args: { target_user_id: "u2", block_status: false } });
  });

  it("setUserRole escolhe o rpc conforme master/supervisor e propaga erro", async () => {
    await setUserRole(true, "u2", "vendedor");
    await setUserRole(false, "u2", "atendente");
    expect(mockSupabase.rpcCalls().map((c) => c.fn)).toEqual(["admin_set_role", "supervisor_set_role"]);
    expect(mockSupabase.rpcCalls()[1].args).toEqual({ target_user_id: "u2", new_role: "atendente" });
    mockSupabase.respondRpc("admin_set_role", { error: new Error("perm") });
    await expect(setUserRole(true, "u2", "x")).rejects.toThrow("perm");
  });

  it("rpcs administrativos propagam erro", async () => {
    mockSupabase.respondRpc("admin_delete_user", { error: new Error("d") });
    await expect(adminDeleteUser("u")).rejects.toThrow("d");
    mockSupabase.respondRpc("admin_add_org_member", { error: new Error("a") });
    await expect(adminAddOrgMember("u", "o")).rejects.toThrow("a");
    mockSupabase.respondRpc("owner_add_org_member", { error: new Error("o") });
    await expect(ownerAddOrgMember("u", "o")).rejects.toThrow("o");
  });

  it("deleteOrganization remove pelo id", async () => {
    await deleteOrganization("o1");
    const calls = mockSupabase.callsFor("organizations");
    expect(calls).toContainEqual(["delete"]);
    expect(calls).toContainEqual(["eq", "id", "o1"]);
  });
});

describe("services/users - organizacao", () => {
  it("getProfileOrganizationId devolve organization_id, null e lanca em erro", async () => {
    mockSupabase.respond("profiles", { data: { organization_id: "o1" } }, { data: null }, { error: new Error("e") });
    expect(await getProfileOrganizationId("u")).toBe("o1");
    expect(await getProfileOrganizationId("u")).toBeNull();
    await expect(getProfileOrganizationId("u")).rejects.toThrow("e");
  });

  it("getOrganizationById devolve a org e propaga erro", async () => {
    mockSupabase.respond("organizations", { data: { id: "o1" } }, { error: new Error("e") });
    expect(await getOrganizationById("o1")).toEqual({ id: "o1" });
    await expect(getOrganizationById("o1")).rejects.toThrow("e");
  });

  it("listOrgMembers filtra por organization_id", async () => {
    mockSupabase.respond("profiles", { data: [{ id: "a" }] });
    expect(await listOrgMembers("o1")).toEqual([{ id: "a" }]);
    expect(mockSupabase.callsFor("profiles")).toContainEqual(["eq", "organization_id", "o1"]);
  });

  it("insertOrganization insere com tenant_id e retorna a linha criada", async () => {
    const row = { name: "N", slug: "n", subdomain: "n", tenant_id: "t1", owner_id: "u1" };
    mockSupabase.respond("organizations", { data: { id: "o9" } });
    expect(await insertOrganization(row)).toEqual({ id: "o9" });
    expect(mockSupabase.callsFor("organizations")).toContainEqual(["insert", row]);
  });

  it("setProfileOrganization mescla extras, aceita null e atualiza so o usuario", async () => {
    await setProfileOrganization("u1", null, { role: "vendedor" });
    const calls = mockSupabase.callsFor("profiles");
    expect(calls).toContainEqual(["update", { organization_id: null, role: "vendedor" }]);
    expect(calls).toContainEqual(["eq", "id", "u1"]);
  });

  it("findProfileBasicsByEmail busca por email e lanca em erro", async () => {
    mockSupabase.respond("profiles", { data: { id: "u", organization_id: null } }, { error: new Error("nf") });
    expect(await findProfileBasicsByEmail("a@b.com")).toEqual({ id: "u", organization_id: null });
    expect(mockSupabase.callsFor("profiles")).toContainEqual(["eq", "email", "a@b.com"]);
    await expect(findProfileBasicsByEmail("x@y.com")).rejects.toThrow("nf");
  });
});

describe("services/users - invokeAdminCreateUser", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const payload = { name: "N", email: "e@x.com", password: "p", role: "vendedor", organization_id: "o1" };

  it("envia POST com Bearer token e payload e retorna o JSON", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ user: { id: "u9" } }) });
    expect(await invokeAdminCreateUser("tok", payload)).toEqual({ user: { id: "u9" } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/functions\/v1\/admin-create-user$/);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it("lanca com a mensagem da API quando !ok e usa fallback quando ausente", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Email em uso" }) });
    await expect(invokeAdminCreateUser("t", payload)).rejects.toThrow("Email em uso");
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    await expect(invokeAdminCreateUser("t", payload)).rejects.toThrow("Erro ao criar usuário");
  });
});
