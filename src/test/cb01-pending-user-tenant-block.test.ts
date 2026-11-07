import { describe, it, expect } from "vitest";
import { evaluateProfileAccess } from "@/lib/auth-access";
import type { Tenant } from "@/contexts/TenantContext";

// CB-01: usuários pendentes/recusados não acessam dados do tenant.
// A garantia de banco (RLS: get_user_tenant_id() retorna NULL para não aprovados)
// está na migration 20261028120000_fix_cb01_pending_user_tenant_block.sql.
// Este teste cobre a camada de app: evaluateProfileAccess, usada por
// AuthContext e AuthCallbackPage para negar a sessão.

const tenant: Tenant = {
  id: "t-1",
  name: "Acme",
  subdomain: "acme",
  plan: "free",
  owner_id: null,
  is_active: true,
  created_at: "",
  updated_at: "",
};

describe("CB-01: pending users blocked from tenant access", () => {
  it("blocks pending user even with tenant_id", () => {
    const denial = evaluateProfileAccess(
      { role: "vendedor", approval_status: "pending", tenant_id: "t-1", client_id: "t-1", is_blocked: false },
      tenant,
      null
    );
    expect(denial).toBe("pending");
  });

  it("blocks pending user without tenant_id", () => {
    const denial = evaluateProfileAccess(
      { role: "vendedor", approval_status: "pending", tenant_id: null, client_id: null, is_blocked: false },
      tenant,
      null
    );
    expect(denial).toBe("pending");
  });

  it("blocks rejected user", () => {
    const denial = evaluateProfileAccess(
      { role: "vendedor", approval_status: "rejected", tenant_id: "t-1", client_id: "t-1", is_blocked: false },
      tenant,
      null
    );
    expect(denial).toBe("rejected");
  });

  it("blocks pending master too (approval check runs before role)", () => {
    const denial = evaluateProfileAccess(
      { role: "master", approval_status: "pending", tenant_id: null, client_id: null, is_blocked: false },
      tenant,
      null
    );
    expect(denial).toBe("pending");
  });

  it("allows approved non-master user of the same tenant", () => {
    const denial = evaluateProfileAccess(
      { role: "vendedor", approval_status: "approved", tenant_id: "t-1", client_id: "t-1", is_blocked: false },
      tenant,
      null
    );
    expect(denial).toBeNull();
  });

  it("allows approved master without tenant_id", () => {
    const denial = evaluateProfileAccess(
      { role: "master", approval_status: "approved", tenant_id: null, client_id: null, is_blocked: false },
      tenant,
      null
    );
    expect(denial).toBeNull();
  });
});
