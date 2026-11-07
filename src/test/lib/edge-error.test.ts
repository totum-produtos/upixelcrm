import { describe, it, expect } from "vitest";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { extractEdgeError } from "@/lib/edge-error";

function httpError(context: unknown) {
  return new FunctionsHttpError(context);
}

describe("extractEdgeError", () => {
  it("lê body string", async () => {
    const err = httpError({ json: async () => "boom" });
    expect(await extractEdgeError(err)).toBe("boom");
  });

  it("prioriza body.error, depois body.message", async () => {
    expect(await extractEdgeError(httpError({ json: async () => ({ error: "x", message: "y" }) }))).toBe("x");
    expect(await extractEdgeError(httpError({ json: async () => ({ message: "y" }) }))).toBe("y");
  });

  it("serializa body desconhecido", async () => {
    expect(await extractEdgeError(httpError({ json: async () => ({ a: 1 }) }))).toBe('{"a":1}');
  });

  it("cai para text() quando json() falha", async () => {
    const err = httpError({
      json: async () => { throw new Error("bad json"); },
      text: async () => "texto cru",
    });
    expect(await extractEdgeError(err)).toBe("texto cru");
  });

  it("cai para status HTTP quando json e text falham", async () => {
    const err = httpError({
      status: 500,
      json: async () => { throw new Error("x"); },
      text: async () => { throw new Error("y"); },
    });
    expect(await extractEdgeError(err)).toBe("Edge Function HTTP 500");
  });

  it("usa message de Error comum e fallback para o resto", async () => {
    expect(await extractEdgeError(new Error("falhou"))).toBe("falhou");
    expect(await extractEdgeError(new Error(""), "padrão")).toBe("padrão");
    expect(await extractEdgeError("string", "fb")).toBe("fb");
    expect(await extractEdgeError(null)).toBe("Erro desconhecido");
  });
});
