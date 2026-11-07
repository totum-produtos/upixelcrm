import { describe, it, expect } from "vitest";
import { cn, coerceLong, formatFileSize } from "@/lib/utils";

describe("cn", () => {
  it("combina classes e resolve conflitos do tailwind", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("a", { b: false }, undefined, ["c"])).toBe("a c");
  });
});

describe("coerceLong", () => {
  it("retorna null para null/undefined/inválidos", () => {
    expect(coerceLong(null)).toBeNull();
    expect(coerceLong(undefined)).toBeNull();
    expect(coerceLong(NaN)).toBeNull();
    expect(coerceLong(Infinity)).toBeNull();
    expect(coerceLong("abc")).toBeNull();
    expect(coerceLong({})).toBeNull();
    expect(coerceLong(true)).toBeNull();
  });

  it("aceita number e string numérica", () => {
    expect(coerceLong(42)).toBe(42);
    expect(coerceLong("1024")).toBe(1024);
  });

  it("converte objeto Long (low/high)", () => {
    expect(coerceLong({ low: 5, high: 0 })).toBe(5);
    expect(coerceLong({ low: 0, high: 1 })).toBe(4294967296);
    // low negativo é tratado como unsigned de 32 bits
    expect(coerceLong({ low: -1, high: 0, unsigned: true })).toBe(4294967295);
    expect(coerceLong({ low: 0, high: -1, unsigned: true })).toBe(4294967295 * 4294967296);
  });
});

describe("formatFileSize", () => {
  it("retorna null para zero, negativo e inválido", () => {
    expect(formatFileSize(0)).toBeNull();
    expect(formatFileSize(-5)).toBeNull();
    expect(formatFileSize(null)).toBeNull();
    expect(formatFileSize("x")).toBeNull();
  });

  it("formata bytes, KB, MB e GB", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(10 * 1024)).toBe("10 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatFileSize(3 * 1024 ** 3)).toBe("3.0 GB");
  });

  it("aceita string e Long", () => {
    expect(formatFileSize("2048")).toBe("2.0 KB");
    expect(formatFileSize({ low: 2048, high: 0 })).toBe("2.0 KB");
  });
});
