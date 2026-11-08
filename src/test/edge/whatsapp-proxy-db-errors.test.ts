import { describe, it, expect } from "vitest";
import { integrationSaveError } from "../../../supabase/functions/whatsapp-proxy/db-errors";

describe("whatsapp-proxy: erro ao salvar integração", () => {
  it("23505 (índice único) vira 409 com mensagem de número já cadastrado", () => {
    const r = integrationSaveError({ code: "23505" });
    expect(r.status).toBe(409);
    expect(r.error).toMatch(/já está cadastrado/);
  });
  it("outros erros continuam 500 com a mensagem genérica", () => {
    expect(integrationSaveError({ code: "42P01" })).toEqual({ status: 500, error: "Erro ao salvar instância no banco de dados." });
    expect(integrationSaveError(null).status).toBe(500);
  });
});
