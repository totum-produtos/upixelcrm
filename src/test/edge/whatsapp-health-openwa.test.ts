import { describe, it, expect } from "vitest";
import { openwaHealth } from "../../../supabase/functions/whatsapp-health-check/openwa-status";

describe("health-check: status de sessão OpenWA", () => {
  it("ready = healthy", () => expect(openwaHealth("ready").status).toBe("healthy"));
  it("aguardando QR = connecting (não acusa servidor inacessível)", () => {
    for (const s of ["created", "starting", "connecting", "qr_ready"]) expect(openwaHealth(s).status).toBe("connecting");
  });
  it("desconectada = disconnected", () => {
    for (const s of ["disconnected", "failed", "logged_out"]) expect(openwaHealth(s).status).toBe("disconnected");
  });
  it("nunca devolve unhealthy (isso é só para erro de rede/HTTP)", () => {
    expect(openwaHealth(undefined).status).not.toBe("unhealthy");
  });
});
