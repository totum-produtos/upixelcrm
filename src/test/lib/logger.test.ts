import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => ({ insert: vi.fn(), from: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: h.from } }));

async function loadLogger(dev: boolean) {
  vi.resetModules();
  vi.stubEnv("DEV", dev);
  return (await import("@/lib/logger")).logger;
}

describe("logger", () => {
  beforeEach(() => {
    h.insert.mockReset().mockReturnValue({ then: (cb: () => void) => cb() });
    h.from.mockReset().mockReturnValue({ insert: h.insert });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("em dev, repassa para o console e não grava no banco", async () => {
    const logger = await loadLogger(true);
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.error("falhou", 1);
    logger.log("ok");
    expect(err).toHaveBeenCalledWith("falhou", 1);
    expect(log).toHaveBeenCalledWith("ok");
    expect(h.from).not.toHaveBeenCalled();
  });

  it("em produção, error grava em error_logs com objetos serializados", async () => {
    const logger = await loadLogger(false);
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("falha", { a: 1 }, 5);
    expect(err).not.toHaveBeenCalled();
    expect(h.from).toHaveBeenCalledWith("error_logs");
    expect(h.insert).toHaveBeenCalledWith({ message: 'falha {"a":1} 5' });
  });

  it("em produção, log/warn/info/debug ficam silenciosos", async () => {
    const logger = await loadLogger(false);
    const spies = (["log", "warn", "info", "debug"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    logger.log("a"); logger.warn("a"); logger.info("a"); logger.debug("a");
    spies.forEach((s) => expect(s).not.toHaveBeenCalled());
    expect(h.from).not.toHaveBeenCalled();
  });

  it("em produção, error não lança se a serialização ou o supabase falham", async () => {
    const logger = await loadLogger(false);
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => logger.error(circular)).not.toThrow();
    h.from.mockImplementation(() => { throw new Error("x"); });
    expect(() => logger.error("a")).not.toThrow();
  });
});
