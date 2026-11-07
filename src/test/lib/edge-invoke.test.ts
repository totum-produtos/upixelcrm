import { describe, it, expect, vi, beforeEach } from "vitest";
import { FunctionsHttpError } from "@supabase/supabase-js";

const h = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: h.getSession, refreshSession: h.refreshSession },
    functions: { invoke: h.invoke },
  },
}));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), log: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { invokeEdge } from "@/lib/edge-invoke";

const nowSec = () => Math.floor(Date.now() / 1000);
const err401 = () =>
  new FunctionsHttpError({
    status: 401,
    clone: () => ({ json: async () => ({ code: "invalid_jwt" }), text: async () => "" }),
  });

describe("invokeEdge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.getSession.mockResolvedValue({ data: { session: { expires_at: nowSec() + 3600 } } });
    h.refreshSession.mockResolvedValue({ data: { session: {} }, error: null });
  });

  it("retorna erro de sessão expirada sem chamar a função quando não há sessão", async () => {
    h.getSession.mockResolvedValue({ data: { session: null } });
    const res = await invokeEdge("fn");
    expect(res.data).toBeNull();
    expect((res.error as Error).message).toMatch(/Sessão expirada/);
    expect(h.invoke).not.toHaveBeenCalled();
  });

  it("não refresca token válido e repassa nome e opções", async () => {
    h.invoke.mockResolvedValue({ data: { ok: 1 }, error: null });
    const opts = { body: { a: 1 } };
    const res = await invokeEdge("minha-fn", opts);
    expect(res.data).toEqual({ ok: 1 });
    expect(h.refreshSession).not.toHaveBeenCalled();
    expect(h.invoke).toHaveBeenCalledWith("minha-fn", opts);
  });

  it("refresca preventivamente quando o JWT expira em menos de 60s", async () => {
    h.getSession.mockResolvedValue({ data: { session: { expires_at: nowSec() + 10 } } });
    h.invoke.mockResolvedValue({ data: 1, error: null });
    await invokeEdge("fn");
    expect(h.refreshSession).toHaveBeenCalledTimes(1);
    expect(h.invoke).toHaveBeenCalledTimes(1);
  });

  it("retorna erro de sessão se o refresh preventivo falha", async () => {
    h.getSession.mockResolvedValue({ data: { session: { expires_at: nowSec() - 5 } } });
    h.refreshSession.mockResolvedValue({ data: {}, error: new Error("revoked") });
    const res = await invokeEdge("fn");
    expect((res.error as Error).message).toMatch(/Sessão expirada/);
    expect(h.invoke).not.toHaveBeenCalled();
  });

  it("refaz a chamada uma vez após 401 e retorna o sucesso", async () => {
    h.invoke
      .mockResolvedValueOnce({ data: null, error: err401() })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });
    const res = await invokeEdge("fn");
    expect(h.refreshSession).toHaveBeenCalledTimes(1);
    expect(h.invoke).toHaveBeenCalledTimes(2);
    expect(res.data).toEqual({ ok: true });
  });

  it("não tenta de novo se o refresh pós-401 falha", async () => {
    const first = { data: null, error: err401() };
    h.invoke.mockResolvedValue(first);
    h.refreshSession.mockResolvedValue({ data: {}, error: new Error("x") });
    const res = await invokeEdge("fn");
    expect(h.invoke).toHaveBeenCalledTimes(1);
    expect(res).toBe(first);
  });

  it("só tenta duas vezes se o 401 persiste", async () => {
    h.invoke.mockResolvedValue({ data: null, error: err401() });
    const res = await invokeEdge("fn");
    expect(h.invoke).toHaveBeenCalledTimes(2);
    expect(res.error).toBeInstanceOf(FunctionsHttpError);
  });

  it("não faz retry para erros que não são 401", async () => {
    const e = new FunctionsHttpError({ status: 500 });
    h.invoke.mockResolvedValue({ data: null, error: e });
    const res = await invokeEdge("fn");
    expect(h.invoke).toHaveBeenCalledTimes(1);
    expect(res.error).toBe(e);
  });
});
