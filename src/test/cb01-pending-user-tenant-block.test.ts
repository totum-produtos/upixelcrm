import { describe, it, expect } from "vitest";
import { getAccessState } from "@/lib/auth-access";

describe("CB-01: pending users blocked from tenant access", () => {
  it("blocks pending user even with tenant_id", () => {
    const state = getAccessState({
      role: "vendedor",
      approval_status: "pending",
      tenant_id: "t-1",
      client_id: "t-1",
      is_blocked: false,
    });
    expect(state).toBe("pending");
  });

  it("blocks pending user without tenant_id", () => {
    const state = getAccessState({
      role: "vendedor",
      approval_status: "pending",
      tenant_id: null,
      client_id: null,
      is_blocked: false,
    });
    expect(state).toBe("pending");
  });

  it("blocks rejected user", () => {
    const state = getAccessState({
      role: "vendedor",
      approval_status: "rejected",
      tenant_id: "t-1",
      client_id: "t-1",
      is_blocked: false,
    });
    expect(state).toBe("rejected");
  });

  it("allows approved non-master user", () => {
    const state = getAccessState({
      role: "vendedor",
      approval_status: "approved",
      tenant_id: "t-1",
      client_id: "t-1",
      is_blocked: false,
    });
    expect(state).toBe("allowed");
  });

  it("allows master even if pending context not possible", () => {
    const state = getAccessState({
      role: "master",
      approval_status: "approved",
      tenant_id: null,
      client_id: null,
      is_blocked: false,
    });
    expect(state).toBe("allowed");
  });
});
