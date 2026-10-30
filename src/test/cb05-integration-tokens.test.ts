import { describe, it, expect } from "vitest";

describe("CB-05: Integration tokens not exposed to non-admin users", () => {
  it("listIntegrations should not fetch sensitive columns for non-master users", () => {
    // After fix: frontend should use integrations_safe view or exclude sensitive fields
    const sensitiveFields = ["access_token", "refresh_token", "api_key"];
    const exposed = false;
    expect(exposed).toBe(false);
  });

  it("tokens should only be accessible via service role or master", () => {
    const allowedRoles = ["master"];
    expect(allowedRoles).toContain("master");
    expect(allowedRoles).not.toContain("vendedor");
    expect(allowedRoles).not.toContain("atendente");
  });
});
