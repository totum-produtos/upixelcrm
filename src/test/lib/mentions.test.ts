import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  listClientMembers: vi.fn(),
  insertNotifications: vi.fn(),
}));

vi.mock("@/services/users", () => h);
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), log: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { extractMentions, notifyMentions } from "@/lib/mentions";

describe("extractMentions", () => {
  it("extrai handles em minúsculas, sem duplicatas", () => {
    expect(extractMentions("oi @Maria e @maria e @joao.silva")).toEqual(["maria", "joao.silva"]);
  });

  it("ignora handle de 1 caractere e texto sem menção", () => {
    expect(extractMentions("oi @a")).toEqual([]);
    expect(extractMentions("sem nada")).toEqual([]);
  });
});

describe("notifyMentions", () => {
  const members = [
    { id: "u1", name: "Maria Souza", email: "maria@x.com" },
    { id: "u2", name: "João Álvares", email: "jalvares@x.com" },
    { id: "u3", name: "Autor", email: "autor@x.com" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    h.listClientMembers.mockResolvedValue(members);
    h.insertNotifications.mockResolvedValue(undefined);
  });

  it("retorna 0 sem consultar membros quando não há menção", async () => {
    expect(await notifyMentions({ clientId: "c1", authorId: "u3", text: "oi" })).toBe(0);
    expect(h.listClientMembers).not.toHaveBeenCalled();
  });

  it("busca membros do tenant correto e notifica com client_id", async () => {
    const n = await notifyMentions({
      clientId: "c1", authorId: "u3", text: "@mariasouza veja", leadId: "l1", leadName: "Lead X",
    });
    expect(n).toBe(1);
    expect(h.listClientMembers).toHaveBeenCalledWith("c1");
    expect(h.insertNotifications).toHaveBeenCalledWith([
      expect.objectContaining({
        client_id: "c1", user_id: "u1", type: "mention", lead_id: "l1",
        title: "Você foi mencionado em Lead X",
      }),
    ]);
  });

  it("casa por slug sem acentos e por handle de email", async () => {
    const n = await notifyMentions({ clientId: "c1", authorId: null, text: "@joaoalvares" });
    expect(n).toBe(1);
    const n2 = await notifyMentions({ clientId: "c1", authorId: null, text: "@jalvares" });
    expect(n2).toBe(1);
    expect(h.insertNotifications.mock.calls[1][0][0].user_id).toBe("u2");
  });

  it("não notifica o próprio autor", async () => {
    expect(await notifyMentions({ clientId: "c1", authorId: "u1", text: "@mariasouza" })).toBe(0);
    expect(h.insertNotifications).not.toHaveBeenCalled();
  });

  it("trunca corpo longo e usa título genérico sem leadName", async () => {
    await notifyMentions({ clientId: "c1", authorId: null, text: "@mariasouza " + "x".repeat(300) });
    const row = h.insertNotifications.mock.calls[0][0][0];
    expect(row.body.length).toBe(201);
    expect(row.body.endsWith("…")).toBe(true);
    expect(row.title).toBe("Você foi mencionado");
    expect(row.lead_id).toBeNull();
  });

  it("retorna 0 se listar membros falha", async () => {
    h.listClientMembers.mockRejectedValue(new Error("db"));
    expect(await notifyMentions({ clientId: "c1", authorId: null, text: "@mariasouza" })).toBe(0);
    expect(h.insertNotifications).not.toHaveBeenCalled();
  });

  it("retorna 0 se inserir notificações falha", async () => {
    h.insertNotifications.mockRejectedValue(new Error("db"));
    expect(await notifyMentions({ clientId: "c1", authorId: null, text: "@mariasouza" })).toBe(0);
  });

  it("retorna 0 quando ninguém casa", async () => {
    expect(await notifyMentions({ clientId: "c1", authorId: null, text: "@ninguem" })).toBe(0);
    expect(h.insertNotifications).not.toHaveBeenCalled();
  });
});
