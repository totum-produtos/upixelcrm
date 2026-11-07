import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadCSV, exportLeadsToCSV } from "@/lib/export";

let blobs: Blob[];
let anchor: { download: string } | null;

beforeEach(() => {
  blobs = [];
  anchor = null;
  URL.createObjectURL = vi.fn((b: Blob) => { blobs.push(b); return "blob:x"; });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    anchor = { download: this.download };
  });
});
afterEach(() => vi.restoreAllMocks());

const readBlob = (b: Blob) =>
  new Promise<string>((res) => {
    const r = new FileReader();
    r.onload = () => res(new TextDecoder("utf-8", { ignoreBOM: true }).decode(r.result as ArrayBuffer));
    r.readAsArrayBuffer(b);
  });

describe("downloadCSV", () => {
  it("não faz nada com lista vazia", () => {
    downloadCSV([], "a.csv");
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("gera CSV com BOM, escapa aspas e trata null", async () => {
    downloadCSV([{ a: 'diz "oi"', b: null }, { a: "x", b: 2 }], "t.csv");
    const text = await readBlob(blobs[0]);
    expect(text).toBe('﻿a,b\n"diz ""oi""",""\n"x","2"');
    expect(blobs[0].type).toContain("text/csv");
  });

  it("dispara download com o nome do arquivo e revoga a URL", () => {
    downloadCSV([{ a: 1 }], "saida.csv");
    expect(anchor?.download).toBe("saida.csv");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:x");
    expect(document.body.querySelector("a")).toBeNull();
  });
});

describe("exportLeadsToCSV", () => {
  it("não gera arquivo sem leads", () => {
    exportLeadsToCSV([]);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("usa cabeçalhos do sistema e junta tags com '; '", async () => {
    exportLeadsToCSV([{ name: "Ana", phone: "11", tags: ["a", "b"] }, { email: "x@y.com", tags: null }]);
    const lines = (await readBlob(blobs[0])).split("\n");
    expect(lines[0]).toBe("﻿Nome,Telefone,Email,Empresa,Cidade,Cargo,Origem,Tags");
    expect(lines[1]).toBe('"Ana","11","","","","","","a; b"');
    expect(lines[2]).toBe('"","","x@y.com","","","","",""');
    expect(anchor?.download).toBe("leads-exportados.csv");
  });

  it("respeita filename customizado", () => {
    exportLeadsToCSV([{ name: "A" }], "meus.csv");
    expect(anchor?.download).toBe("meus.csv");
  });
});
