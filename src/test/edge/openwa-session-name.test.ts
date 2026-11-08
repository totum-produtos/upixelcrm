import { describe, it, expect } from "vitest";
import { openwaSessionName } from "../../../supabase/functions/whatsapp-proxy/openwa-session";

describe("openwaSessionName", () => {
  const tenant = "c637af73-096c-4bff-87d1-7f98a46a0cbf";
  it("prefixa com o tenant e só usa [a-z0-9-]", () => {
    const n = openwaSessionName(tenant, 1_794_150_000_000, 0.5);
    expect(n).toMatch(/^upixel-c637af73-[a-z0-9]+$/);
  });
  it("muda a cada chamada (evita 409 por nome repetido)", () => {
    expect(openwaSessionName(tenant, 1, 0.1)).not.toBe(openwaSessionName(tenant, 1, 0.2));
    expect(openwaSessionName(tenant, 1, 0.1)).not.toBe(openwaSessionName(tenant, 2, 0.1));
  });
});

import { pollQr } from "../../../supabase/functions/whatsapp-proxy/openwa-session";

describe("pollQr", () => {
  const noSleep = () => Promise.resolve();
  it("tenta de novo até o QR ficar pronto", async () => {
    let calls = 0;
    const qr = await pollQr(async () => (++calls < 3 ? null : "data:image/png;base64,AAA"), 10, 0, noSleep);
    expect(qr).toBe("data:image/png;base64,AAA");
    expect(calls).toBe(3);
  });
  it("desiste depois das tentativas e trata exceção como 'ainda não'", async () => {
    let calls = 0;
    const qr = await pollQr(async () => { calls++; throw new Error("rede"); }, 4, 0, noSleep);
    expect(qr).toBeNull();
    expect(calls).toBe(4);
  });
});
