import { describe, it, expect } from "vitest";
import { CONNECTING_STUCK_MS, isConnectingStuck, isTerminalStatus } from "@/lib/whatsapp-connecting";

describe("isTerminalStatus", () => {
  it("encerra a espera em conectado, desconectado, configurado ou pausado", () => {
    for (const s of ["connected", "disconnected", "configured", "paused"]) expect(isTerminalStatus(s)).toBe(true);
  });
  it("continua esperando em connecting ou status desconhecido", () => {
    for (const s of ["connecting", "", null, undefined, "qr_ready"]) expect(isTerminalStatus(s)).toBe(false);
  });
});

describe("isConnectingStuck", () => {
  it("só trava depois do limite", () => {
    expect(isConnectingStuck(1_000, 1_000 + CONNECTING_STUCK_MS - 1)).toBe(false);
    expect(isConnectingStuck(1_000, 1_000 + CONNECTING_STUCK_MS)).toBe(true);
  });
  it("sem início marcado nunca trava", () => {
    expect(isConnectingStuck(null, Number.MAX_SAFE_INTEGER)).toBe(false);
  });
});
