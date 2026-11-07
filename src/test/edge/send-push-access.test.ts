import { describe, it, expect } from "vitest";
import { isInternalServiceCall } from "../../../supabase/functions/send-push/access";

const KEY = "service-role-key-abc123";

describe("SEC-1: send-push aceita chamada interna com service role", () => {
  it("reconhece o bearer igual à service role key", () => {
    expect(isInternalServiceCall(`Bearer ${KEY}`, KEY)).toBe(true);
  });

  it("rejeita JWT de usuário (outro valor)", () => {
    expect(isInternalServiceCall("Bearer eyJ.user.jwt", KEY)).toBe(false);
  });

  it("rejeita prefixo ou sufixo da chave", () => {
    expect(isInternalServiceCall(`Bearer ${KEY.slice(0, -1)}`, KEY)).toBe(false);
    expect(isInternalServiceCall(`Bearer ${KEY}x`, KEY)).toBe(false);
  });

  it("rejeita header ausente, sem Bearer, ou chave não configurada", () => {
    expect(isInternalServiceCall(null, KEY)).toBe(false);
    expect(isInternalServiceCall(KEY, KEY)).toBe(false);
    expect(isInternalServiceCall(`Bearer ${KEY}`, undefined)).toBe(false);
    expect(isInternalServiceCall("Bearer ", "")).toBe(false);
  });
});
