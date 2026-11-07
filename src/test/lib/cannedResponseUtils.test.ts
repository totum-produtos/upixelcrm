import { describe, it, expect } from "vitest";
import { interpolateCannedResponse } from "@/lib/cannedResponseUtils";

const lead = { name: " Maria ", phone: "11999990000", email: "m@x.com", company: "Acme" };

describe("interpolateCannedResponse", () => {
  it("substitui variáveis contact.* e lead.*", () => {
    const out = interpolateCannedResponse(
      "Oi {{contact.name}} / {{lead.name}}, {{contact.phone}} {{lead.email}} {{contact.company}}",
      lead,
      "João",
    );
    expect(out).toBe("Oi Maria / Maria, 11999990000 m@x.com Acme");
  });

  it("aceita espaços dentro das chaves e múltiplas ocorrências", () => {
    expect(interpolateCannedResponse("{{ lead.name }} {{  contact.name  }}", lead)).toBe("Maria Maria");
  });

  it("substitui agent.name", () => {
    expect(interpolateCannedResponse("Aqui é {{agent.name}}", lead, " João ")).toBe("Aqui é João");
  });

  it("usa fallbacks quando faltam dados", () => {
    expect(interpolateCannedResponse("{{lead.name}}|{{lead.phone}}|{{agent.name}}", null)).toBe("Cliente||Atendente");
    expect(interpolateCannedResponse("{{lead.name}}", { name: "   " })).toBe("Cliente");
  });

  it("retorna template vazio como veio e preserva variáveis desconhecidas", () => {
    expect(interpolateCannedResponse("", lead)).toBe("");
    expect(interpolateCannedResponse("{{foo.bar}}", lead)).toBe("{{foo.bar}}");
  });
});
