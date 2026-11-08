import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { functionName, PUBLIC_FUNCTIONS, verifyJwt } from "../../../deploy/selfhosted/volumes/functions/main/auth";

// Valor repetitivo de propósito: string com cara de chave dispara o gitleaks.
const SECRET = "x".repeat(40);
const b64url = (s: string) => Buffer.from(s).toString("base64url");
function sign(payload: object, secret = SECRET, alg = "HS256") {
  const h = b64url(JSON.stringify({ alg, typ: "JWT" }));
  const p = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${sig}`;
}

describe("roteador self-hosted: verifyJwt", () => {
  it("aceita token válido não expirado", async () => {
    expect(await verifyJwt(sign({ role: "anon", exp: 9999999999 }), SECRET)).toBe(true);
  });
  it("aceita token sem exp (anon key do self-hosted tem exp longo, mas vale sem também)", async () => {
    expect(await verifyJwt(sign({ role: "anon" }), SECRET)).toBe(true);
  });
  it("rejeita assinatura com outro segredo", async () => {
    expect(await verifyJwt(sign({ role: "anon" }, "outro-segredo"), SECRET)).toBe(false);
  });
  it("rejeita token expirado", async () => {
    expect(await verifyJwt(sign({ role: "authenticated", exp: 1000 }), SECRET)).toBe(false);
  });
  it("rejeita alg diferente de HS256 e lixo", async () => {
    expect(await verifyJwt(sign({ role: "anon" }, SECRET, "none"), SECRET)).toBe(false);
    expect(await verifyJwt("", SECRET)).toBe(false);
    expect(await verifyJwt("a.b.c", SECRET)).toBe(false);
  });
  it("rejeita tudo se o segredo não estiver configurado", async () => {
    expect(await verifyJwt(sign({ role: "anon" }), "")).toBe(false);
  });
});

describe("roteador self-hosted: functionName", () => {
  it("extrai o nome e bloqueia path estranho", () => {
    expect(functionName("/whatsapp-proxy")).toBe("whatsapp-proxy");
    expect(functionName("/whatsapp-proxy/sub")).toBe("whatsapp-proxy");
    expect(functionName("/")).toBeNull();
    expect(functionName("/_shared")).toBeNull();
    expect(functionName("/..")).toBeNull();
  });
});

describe("roteador self-hosted: allowlist sem JWT", () => {
  it("é exatamente o conjunto verify_jwt = false do supabase/config.toml", () => {
    const toml = readFileSync("supabase/config.toml", "utf8");
    const fromToml = [...toml.matchAll(/\[functions\.([a-z0-9-]+)\][^[]*?verify_jwt\s*=\s*false/g)].map((m) => m[1]);
    expect([...PUBLIC_FUNCTIONS].sort()).toEqual(fromToml.sort());
  });
});
