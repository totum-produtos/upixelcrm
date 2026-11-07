import { describe, it, expect } from "vitest";
import {
  parseCSV,
  matrixToCsvData,
  normalizeHeader,
  autoMapHeaders,
  suggestFieldType,
  normalizePhoneBR,
  getMappedValue,
  buildCustomFields,
  buildLeadsToInsert,
  type CsvData,
} from "@/lib/import-parsing";

const TENANT = "11111111-2222-4333-8444-555555555555";

describe("parseCSV", () => {
  it("separa por vírgula e preenche linhas curtas", () => {
    expect(parseCSV("a,b,c\n1,2\n4,5,6")).toEqual({
      headers: ["a", "b", "c"],
      rows: [["1", "2", ""], ["4", "5", "6"]],
    });
  });

  it("NÃO trata ponto e vírgula como separador (comportamento original)", () => {
    expect(parseCSV("nome;telefone\nAna;11999999999")).toEqual({
      headers: ["nome;telefone"],
      rows: [["Ana;11999999999"]],
    });
  });

  it("campos entre aspas com vírgula, aspas escapadas e quebra de linha", () => {
    const r = parseCSV('nome,obs\n"Silva, Ana","disse ""oi"""\n"Linha\nQuebrada",x');
    expect(r.headers).toEqual(["nome", "obs"]);
    expect(r.rows).toEqual([
      ["Silva, Ana", 'disse "oi"'],
      ["Linha\nQuebrada", "x"],
    ]);
  });

  it("remove BOM UTF-8", () => {
    expect(parseCSV("\uFEFFnome,email\nA,a@x.com").headers).toEqual(["nome", "email"]);
  });

  it("aceita CRLF e CR, ignora linhas vazias e faz trim das células", () => {
    const r = parseCSV("a,b\r\n\r\n 1 , 2 \r\n,\r\n3,4\r");
    expect(r.rows).toEqual([["1", "2"], ["3", "4"]]);
  });

  it("descarta colunas excedentes do cabeçalho", () => {
    expect(parseCSV("a,b\n1,2,3").rows).toEqual([["1", "2"]]);
  });

  it("texto vazio retorna estrutura vazia", () => {
    expect(parseCSV("")).toEqual({ headers: [], rows: [] });
    expect(parseCSV("\n\n  \n")).toEqual({ headers: [], rows: [] });
  });

  it("última linha sem quebra final é mantida", () => {
    expect(parseCSV("a,b\n1,2").rows).toEqual([["1", "2"]]);
  });
});

describe("matrixToCsvData", () => {
  it("descarta linhas vazias iniciais e normaliza para string", () => {
    const r = matrixToCsvData([["", ""], [" Nome ", "Tel"], ["Ana", "11"], ["Bia"]]);
    expect(r).toEqual({ headers: ["Nome", "Tel"], rows: [["Ana", "11"], ["Bia", ""]] });
  });

  it("retorna null quando vazia", () => {
    expect(matrixToCsvData([])).toBeNull();
    expect(matrixToCsvData([["", " "]])).toBeNull();
  });
});

describe("autoMapHeaders", () => {
  it("normalizeHeader remove acento, espaço, _, parênteses e hífen", () => {
    expect(normalizeHeader("Razão_Social (PJ)-X")).toBe("razaosocialpjx");
  });

  it("mapeia aliases em PT e EN", () => {
    expect(autoMapHeaders(["Nome", "Celular", "E-mail", "Empresa", "Cidade", "Cargo", "Fonte", "Etiquetas"])).toEqual({
      name: "Nome",
      phone: "Celular",
      email: "E-mail",
      company: "Empresa",
      city: "Cidade",
      position: "Cargo",
      origin: "Fonte",
      tags: "Etiquetas",
    });
  });

  it("usa o primeiro cabeçalho que casa e deixa de fora os sem match", () => {
    expect(autoMapHeaders(["x", "Nome Completo", "Nome Fantasia"])).toEqual({
      name: "Nome Completo",
      company: "Nome Fantasia",
    });
  });
});

describe("normalizePhoneBR", () => {
  it("remove não dígitos, DDI 55 e nono dígito", () => {
    expect(normalizePhoneBR("+55 11 9 8765-4321")).toBe("1187654321");
    expect(normalizePhoneBR("11 98765-4321")).toBe("1187654321");
    expect(normalizePhoneBR("(11) 8765-4321")).toBe("1187654321");
    expect(normalizePhoneBR("551187654321")).toBe("1187654321");
  });

  it("DDDs diferentes não colidem", () => {
    expect(normalizePhoneBR("1187654321")).not.toBe(normalizePhoneBR("3187654321"));
  });

  it("números curtos e vazios", () => {
    expect(normalizePhoneBR("12345")).toBe("12345");
    expect(normalizePhoneBR("")).toBe("");
  });
});

describe("suggestFieldType", () => {
  const csv = (header: string, values: string[]): CsvData => ({
    headers: [header],
    rows: values.map((v) => [v]),
  });

  it("por nome do cabeçalho", () => {
    expect(suggestFieldType(csv("Data de Nascimento", ["x"]), "Data de Nascimento").type).toBe("date");
    expect(suggestFieldType(csv("Site", ["x"]), "Site").type).toBe("link");
    expect(suggestFieldType(csv("Renda", ["x"]), "Renda").type).toBe("number");
    expect(suggestFieldType(csv("Observações", ["x"]), "Observações").type).toBe("textarea");
  });

  it("por conteúdo: numérico BR", () => {
    expect(suggestFieldType(csv("Q", ["1.200,50", "3"]), "Q").type).toBe("number");
  });

  it("por conteúdo: baixa cardinalidade vira select com opções", () => {
    const r = suggestFieldType(csv("Status", ["a", "b", "a", "b", "c"]), "Status");
    expect(r.type).toBe("select");
    expect(r.options).toEqual([
      { label: "a", value: "a" },
      { label: "b", value: "b" },
      { label: "c", value: "c" },
    ]);
  });

  it("poucas amostras ou sem csv viram texto", () => {
    expect(suggestFieldType(csv("Z", ["a", "b"]), "Z")).toEqual({ type: "text", options: [] });
    expect(suggestFieldType(null, "Z")).toEqual({ type: "text", options: [] });
    expect(suggestFieldType(csv("Z", ["a"]), "inexistente")).toEqual({ type: "text", options: [] });
    expect(suggestFieldType(csv("Z", ["", ""]), "Z")).toEqual({ type: "text", options: [] });
  });
});

describe("getMappedValue", () => {
  const csv: CsvData = { headers: ["N", "T"], rows: [] };
  it("retorna null para não mapeado, __skip, coluna inexistente e célula vazia", () => {
    expect(getMappedValue(csv, {}, ["a", "b"], "name")).toBeNull();
    expect(getMappedValue(csv, { name: "__skip" }, ["a", "b"], "name")).toBeNull();
    expect(getMappedValue(csv, { name: "X" }, ["a", "b"], "name")).toBeNull();
    expect(getMappedValue(csv, { name: "N" }, ["", "b"], "name")).toBeNull();
  });
  it("retorna o valor sem trim adicional", () => {
    expect(getMappedValue(csv, { name: "T" }, ["a", " b "], "name")).toBe(" b ");
  });
});

describe("buildCustomFields", () => {
  const csv: CsvData = { headers: ["n", "c", "m", "t"], rows: [] };
  const mapping = { "cf:num": "n", "cf:chk": "c", "cf:multi": "m", "cf:txt": "t" };
  const defs = [
    { slug: "num", field_type: "number" },
    { slug: "chk", field_type: "checkbox" },
    { slug: "multi", field_type: "multi_select" },
    { slug: "txt", field_type: "text" },
  ];

  it("converte por tipo", () => {
    expect(buildCustomFields(["12,5", "Sim", "a; b ;;c", "oi"], csv, mapping, defs)).toEqual({
      num: 12.5,
      chk: true,
      multi: ["a", "b", "c"],
      txt: "oi",
    });
  });

  it("ignora vazios e números inválidos; checkbox falso", () => {
    expect(buildCustomFields(["abc", "nao", "", ""], csv, mapping, defs)).toEqual({ chk: false });
  });

  it("número com milhar BR não remove o ponto (comportamento original)", () => {
    expect(buildCustomFields(["1.200,50", "", "", ""], csv, mapping, defs)).toEqual({});
  });
});

describe("buildLeadsToInsert", () => {
  const csv: CsvData = {
    headers: ["Nome", "Tel", "Mail", "Tags"],
    rows: [
      ["Ana", "11 98765-4321", "ana@x.com", "a; b"],
      ["", "11 90000-0000", "x@x.com", ""],
      ["Bia", "(11) 8765-4321", "", ""],
      ["Cris", "", "", ""],
    ],
  };
  const mapping = { name: "Nome", phone: "Tel", email: "Mail", tags: "Tags" };
  const base = { csvData: csv, mapping, defs: [], columnId: "col-1", clientId: "cli-1", tenantId: TENANT };

  it("monta payload, ignora sem nome e duplicados (inclusive dentro do arquivo)", () => {
    const keys = new Set<string>();
    const r = buildLeadsToInsert({ ...base, existingPhoneKeys: keys });
    expect(r.skippedNoName).toBe(1);
    expect(r.skippedDuplicate).toBe(1);
    expect(r.leadsToInsert.map((l) => l.name)).toEqual(["Ana", "Cris"]);
    expect(r.leadsToInsert[0]).toEqual({
      name: "Ana",
      phone: "11 98765-4321",
      email: "ana@x.com",
      company: null,
      city: null,
      position: null,
      origin: "Importação",
      tags: ["a", "b"],
      column_id: "col-1",
      client_id: "cli-1",
      custom_fields: {},
      tenant_id: TENANT,
    });
    expect(r.leadsToInsert[1].phone).toBeNull();
    expect(keys.has("1187654321")).toBe(true);
  });

  it("telefone já existente na base é ignorado", () => {
    const r = buildLeadsToInsert({ ...base, existingPhoneKeys: new Set(["1187654321"]) });
    expect(r.skippedDuplicate).toBe(2);
    expect(r.leadsToInsert.map((l) => l.name)).toEqual(["Cris"]);
  });

  it("tenant_id só é incluído quando for UUID", () => {
    const master = buildLeadsToInsert({ ...base, tenantId: "master", existingPhoneKeys: new Set() });
    expect(master.leadsToInsert[0]).not.toHaveProperty("tenant_id");
    expect(master.leadsToInsert[0].client_id).toBe("cli-1");
    const none = buildLeadsToInsert({ ...base, tenantId: undefined, existingPhoneKeys: new Set() });
    expect(none.leadsToInsert[0]).not.toHaveProperty("tenant_id");
  });

  it("sem mapeamento de nome, todas as linhas são ignoradas", () => {
    const r = buildLeadsToInsert({ ...base, mapping: {}, existingPhoneKeys: new Set() });
    expect(r.leadsToInsert).toHaveLength(0);
    expect(r.skippedNoName).toBe(4);
  });
});
