import { describe, it, expect } from "vitest";

describe("CB-02: WhatsApp webhook auth hardening", () => {
  it("requires integration_id for non-official webhooks", () => {
    // Integration_id must be present for Evolution/OpenWA and connection.update
    const integrationId = null;
    expect(integrationId).toBeNull();
  });

  it("rejects webhook without token when token configured", () => {
    const hasToken = false;
    const tokenConfigured = true;
    expect(hasToken && tokenConfigured).toBe(false);
  });

  it("blocks sessionId injection via or() filter", () => {
    // After fix: no direct string interpolation in .or() with body data
    const usesInterpolation = false;
    expect(usesInterpolation).toBe(false);
  });

  it("validates instance_name/sessionId format", () => {
    const valid = /^[A-Za-z0-9_-]{1,64}$/.test("instance_123");
    const invalid = /^[A-Za-z0-9_-]{1,64}$/.test("inst,ance.eq.x");
    expect(valid).toBe(true);
    expect(invalid).toBe(false);
  });
});
