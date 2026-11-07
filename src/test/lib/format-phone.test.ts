import { describe, it, expect } from "vitest";
import { formatPhone } from "@/lib/format-phone";

describe("formatPhone", () => {
  it("retorna string vazia para null, undefined e vazio", () => {
    expect(formatPhone(null)).toBe("");
    expect(formatPhone(undefined)).toBe("");
    expect(formatPhone("")).toBe("");
  });

  it("formata celular de 11 dígitos", () => {
    expect(formatPhone("11987654321")).toBe("11 98765-4321");
  });

  it("formata fixo de 10 dígitos", () => {
    expect(formatPhone("1133334444")).toBe("11 3333-4444");
  });

  it("remove o DDI 55 quando sobra número BR plausível", () => {
    expect(formatPhone("5511987654321")).toBe("11 98765-4321");
    expect(formatPhone("551133334444")).toBe("11 3333-4444");
  });

  it("ignora máscara e símbolos na entrada", () => {
    expect(formatPhone("+55 (11) 98765-4321")).toBe("11 98765-4321");
  });

  it("não decapita DDD 55 em número de 11 dígitos", () => {
    expect(formatPhone("55987654321")).toBe("55 98765-4321");
  });

  it("devolve o valor cru quando não bate com o padrão BR", () => {
    expect(formatPhone("+1 202 555 0143 99")).toBe("+1 202 555 0143 99");
    expect(formatPhone("12345")).toBe("12345");
  });
});
