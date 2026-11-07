import { describe, it, expect } from "vitest";
import { canAccessTenant, resolveCallerTenant } from "../../../supabase/functions/whatsapp-status-probe/access";

const T1 = "11111111-1111-4111-8111-111111111111";
const T2 = "22222222-2222-4222-8222-222222222222";
const EMPTY = "00000000-0000-0000-0000-000000000000";

describe("SEC-2: whatsapp-status-probe só responde ao tenant dono", () => {
  it("permite usuário aprovado do mesmo tenant (tenant_id)", () => {
    expect(canAccessTenant({ role: "vendedor", tenant_id: T1, approval_status: "approved" }, T1)).toBe(true);
  });

  it("permite pelo client_id quando tenant_id é vazio", () => {
    expect(canAccessTenant({ role: "vendedor", tenant_id: EMPTY, client_id: T1 }, T1)).toBe(true);
  });

  it("nega usuário de outro tenant (o furo original)", () => {
    expect(canAccessTenant({ role: "supervisor", tenant_id: T2, approval_status: "approved" }, T1)).toBe(false);
  });

  it("nega quando o chamador não tem tenant", () => {
    expect(canAccessTenant({ role: "vendedor", tenant_id: null, client_id: null }, T1)).toBe(false);
  });

  it("nega quando a integração não tem dono", () => {
    expect(canAccessTenant({ role: "vendedor", tenant_id: T1 }, null)).toBe(false);
  });

  it("nega pendente, recusado e bloqueado mesmo no próprio tenant", () => {
    expect(canAccessTenant({ role: "vendedor", tenant_id: T1, approval_status: "pending" }, T1)).toBe(false);
    expect(canAccessTenant({ role: "vendedor", tenant_id: T1, approval_status: "rejected" }, T1)).toBe(false);
    expect(canAccessTenant({ role: "vendedor", tenant_id: T1, is_blocked: true }, T1)).toBe(false);
  });

  it("master aprovado acessa qualquer tenant, master bloqueado não", () => {
    expect(canAccessTenant({ role: "master", approval_status: "approved" }, T2)).toBe(true);
    expect(canAccessTenant({ role: "master", is_blocked: true }, T2)).toBe(false);
  });

  it("resolveCallerTenant ignora valores que não são UUID", () => {
    expect(resolveCallerTenant({ tenant_id: "acme", client_id: T1 })).toBe(T1);
    expect(resolveCallerTenant({ tenant_id: "", client_id: "x" })).toBeNull();
  });
});
