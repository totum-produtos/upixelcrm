import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formatRelativeTime, formatShortDate } from "@/lib/format-date";

const NOW = new Date("2026-05-10T12:00:00.000Z");
const ago = (sec: number) => new Date(NOW.getTime() - sec * 1000).toISOString();

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("retorna vazio para null, undefined e data inválida", () => {
    expect(formatRelativeTime(null)).toBe("");
    expect(formatRelativeTime(undefined)).toBe("");
    expect(formatRelativeTime("não é data")).toBe("");
  });

  it("retorna 'Agora' abaixo de 60s", () => {
    expect(formatRelativeTime(ago(0))).toBe("Agora");
    expect(formatRelativeTime(ago(59))).toBe("Agora");
  });

  it("retorna minutos, horas e dias", () => {
    expect(formatRelativeTime(ago(60))).toBe("Há 1min");
    expect(formatRelativeTime(ago(59 * 60))).toBe("Há 59min");
    expect(formatRelativeTime(ago(3600))).toBe("Há 1h");
    expect(formatRelativeTime(ago(23 * 3600))).toBe("Há 23h");
    expect(formatRelativeTime(ago(24 * 3600))).toBe("Há 1d");
    expect(formatRelativeTime(ago(29 * 86400))).toBe("Há 29d");
  });

  it("usa data absoluta a partir de 30 dias", () => {
    const iso = ago(30 * 86400);
    expect(formatRelativeTime(iso)).toBe(new Date(iso).toLocaleDateString("pt-BR"));
  });

  it("retorna 'Agendado' para datas futuras", () => {
    expect(formatRelativeTime(ago(-3600))).toBe("Agendado");
  });
});

describe("formatShortDate", () => {
  it("retorna vazio para vazio ou inválido", () => {
    expect(formatShortDate(null)).toBe("");
    expect(formatShortDate(undefined)).toBe("");
    expect(formatShortDate("xx")).toBe("");
  });

  it("formata como dd/MM", () => {
    expect(formatShortDate("2026-03-05T12:00:00")).toBe("05/03");
    expect(formatShortDate("2026-12-25T12:00:00")).toBe("25/12");
  });
});
