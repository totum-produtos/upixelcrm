/**
 * Funções puras de parsing, normalização e validação da importação de leads.
 * Extraídas de src/pages/ImportPage.tsx sem mudança de comportamento.
 * Sem React, sem acesso a rede.
 */
import type { TablesInsert, Json } from "@/integrations/supabase/types";
import type { CustomFieldType } from "@/types";
import { tenantIdField } from "@/lib/tenant-utils";

export interface SystemField {
  key: string;
  label: string;
  required: boolean;
}

export const SYSTEM_FIELDS: SystemField[] = [
  { key: "name", label: "Nome", required: true },
  { key: "phone", label: "Telefone", required: false },
  { key: "email", label: "Email", required: false },
  { key: "company", label: "Empresa", required: false },
  { key: "city", label: "Cidade", required: false },
  { key: "position", label: "Cargo", required: false },
  { key: "origin", label: "Origem", required: false },
  { key: "tags", label: "Tags (separadas por ;)", required: false },
];

export interface CsvData {
  headers: string[];
  rows: string[][];
}

export interface ImportResult {
  inserted: number;
  skipped: number;
  skippedNoName: number;
  skippedDuplicate: number;
  errors: number;
}

export interface FieldTypeSuggestion {
  type: CustomFieldType;
  options: Array<{ label: string; value: string }>;
}

/** Subconjunto da definição de campo personalizado usado ao montar os leads. */
export interface CustomFieldDefLike {
  slug: string;
  field_type: string;
}

// Trata campos entre aspas, vírgulas dentro de aspas, CRLF/LF e BOM UTF-8.
// Somente a vírgula é separador (ponto e vírgula NÃO é detectado, comportamento original).
export function parseCSV(text: string): CsvData {
  const clean = text.replace(/^\uFEFF/, "");
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { cell += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cell += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(cell.trim()); cell = ""; }
      else if (ch === '\r' && next === '\n') {
        row.push(cell.trim());
        if (row.some((c) => c !== "")) lines.push(row);
        row = []; cell = ""; i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(cell.trim());
        if (row.some((c) => c !== "")) lines.push(row);
        row = []; cell = "";
      } else {
        cell += ch;
      }
    }
  }
  if (cell || row.length > 0) {
    row.push(cell.trim());
    if (row.some((c) => c !== "")) lines.push(row);
  }

  if (lines.length === 0) return { headers: [], rows: [] };
  const [headers, ...rawRows] = lines;
  const rows = rawRows.map((r) => {
    const padded = [...r];
    while (padded.length < headers.length) padded.push("");
    return padded.slice(0, headers.length);
  });
  return { headers, rows };
}

/**
 * Converte a matriz bruta de uma planilha (primeira aba) em CsvData.
 * Descarta linhas totalmente vazias; a primeira linha restante vira o cabeçalho.
 * Retorna null quando não sobra nenhuma linha (planilha vazia).
 */
export function matrixToCsvData(matrix: string[][]): CsvData | null {
  const nonEmpty = matrix.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
  if (nonEmpty.length === 0) return null;
  const [headerRow, ...dataRows] = nonEmpty;
  const headers = headerRow.map((h) => String(h ?? "").trim());
  const rows = dataRows.map((r) => headers.map((_, i) => String(r[i] ?? "").trim()));
  return { headers, rows };
}

/** Minúsculas, sem acentos, sem espaços, "_", "(", ")" e "-". */
export function normalizeHeader(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s|_|\(|\)|-/g, "");
}

const HEADER_ALIASES: Record<string, string[]> = {
  name: ["nome", "name", "contato", "cliente", "razaosocial"],
  phone: ["telefone", "phone", "tel", "celular", "fone", "whatsapp", "telcomercial"],
  email: ["email", "e-mail", "mail", "emailcontato"],
  company: ["empresa", "company", "negocio", "business", "nomefantasia"],
  city: ["cidade", "city", "municipio"],
  position: ["cargo", "position", "funcao", "role"],
  origin: ["origem", "origin", "fonte", "source"],
  tags: ["tags", "etiquetas", "labels"],
};

/** Auto-mapeamento: associa cada campo do sistema ao primeiro cabeçalho que contém um alias. */
export function autoMapHeaders(headers: string[]): Record<string, string> {
  const autoMap: Record<string, string> = {};
  for (const field of SYSTEM_FIELDS) {
    const fieldAliases = HEADER_ALIASES[field.key] || [field.key];
    const match = headers.find((h) =>
      fieldAliases.some((a) => normalizeHeader(h).includes(normalizeHeader(a)))
    );
    if (match) autoMap[field.key] = match;
  }
  return autoMap;
}

/**
 * Sugere um field_type amostrando até 20 valores não vazios da coluna.
 * Retorna o tipo e, quando for select, as opções pré-populadas.
 */
export function suggestFieldType(csvData: CsvData | null, csvHeader: string): FieldTypeSuggestion {
  const empty: FieldTypeSuggestion = { type: "text", options: [] };
  if (!csvData) return empty;
  const idx = csvData.headers.indexOf(csvHeader);
  if (idx < 0) return empty;

  const headerNorm = csvHeader.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/(data|nascimento|vencimento|aniversari)/.test(headerNorm)) return { type: "date", options: [] };
  if (/(link|url|site|website)/.test(headerNorm)) return { type: "link", options: [] };
  if (/(preco|valor|faturamento|receita|salari|renda|ticket|investimento|orcamento)/.test(headerNorm)) {
    return { type: "number", options: [] };
  }
  if (/(observa|descric|notas|coment)/.test(headerNorm)) return { type: "textarea", options: [] };

  const samples = csvData.rows
    .map((r) => (r[idx] ?? "").trim())
    .filter((v) => v !== "")
    .slice(0, 20);
  if (samples.length === 0) return empty;

  // Detecção numérica: todos os valores viram número (após normalizar o formato BR)
  const numericish = samples.every((v) => {
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    return !Number.isNaN(n);
  });
  if (numericish) return { type: "number", options: [] };

  // Baixa cardinalidade: select
  const distinct = Array.from(new Set(samples));
  if (samples.length >= 5 && distinct.length <= 8) {
    return {
      type: "select",
      options: distinct.map((v) => ({ label: v, value: v })),
    };
  }

  return empty;
}

// Normaliza telefone BR para comparação: tira não-dígitos, remove código do país (55)
// se presente, remove dígito 9 prefixo do celular se houver, para que números no
// formato "+55 11 9 8765-4321" e "11 8765-4321" (formato antigo) ainda colidam.
// Retorna DDD + número (10 dígitos), evitando colisões entre DDDs diferentes.
export function normalizePhoneBR(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length === 12 && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length === 11 && digits[2] === "9") {
    digits = digits.slice(0, 2) + digits.slice(3);
  }
  return digits.slice(-10);
}

/** Valor da célula mapeada para o campo, ou null (não mapeado, "__skip" ou vazio). */
export function getMappedValue(
  csvData: CsvData,
  mapping: Record<string, string>,
  row: string[],
  fieldKey: string,
): string | null {
  const csvCol = mapping[fieldKey];
  if (!csvCol || csvCol === "__skip") return null;
  const idx = csvData.headers.indexOf(csvCol);
  return idx >= 0 && row[idx] ? row[idx] : null;
}

/** Monta o JSON de custom_fields de uma linha a partir das definições mapeadas. */
export function buildCustomFields(
  row: string[],
  csvData: CsvData,
  mapping: Record<string, string>,
  defs: CustomFieldDefLike[],
): Record<string, Json> {
  const custom_fields: Record<string, Json> = {};
  for (const def of defs) {
    const raw = getMappedValue(csvData, mapping, row, `cf:${def.slug}`);
    if (raw === null || raw === "") continue;
    if (def.field_type === "number") {
      const n = Number(raw.replace(",", "."));
      if (!Number.isNaN(n)) custom_fields[def.slug] = n;
    } else if (def.field_type === "checkbox") {
      custom_fields[def.slug] = ["true", "1", "sim", "yes"].includes(raw.toLowerCase());
    } else if (def.field_type === "multi_select") {
      custom_fields[def.slug] = raw.split(";").map((s) => s.trim()).filter(Boolean);
    } else {
      custom_fields[def.slug] = raw;
    }
  }
  return custom_fields;
}

export interface BuildLeadsParams {
  csvData: CsvData;
  mapping: Record<string, string>;
  defs: CustomFieldDefLike[];
  /** Chaves de telefone já existentes. É MUTADO: telefones aceitos são adicionados (dedup dentro do arquivo). */
  existingPhoneKeys: Set<string>;
  columnId: string;
  clientId: string;
  /** tenant.id; só vai no payload se for UUID (master view usa a sentinela "master"). */
  tenantId: string | null | undefined;
}

export interface BuildLeadsResult {
  leadsToInsert: TablesInsert<"leads">[];
  skippedNoName: number;
  skippedDuplicate: number;
}

/** Valida e transforma as linhas em payload de insert, aplicando regras de nome obrigatório e dedup por telefone. */
export function buildLeadsToInsert(params: BuildLeadsParams): BuildLeadsResult {
  const { csvData, mapping, defs, existingPhoneKeys, columnId, clientId, tenantId } = params;
  const leadsToInsert: TablesInsert<"leads">[] = [];
  let skippedNoName = 0;
  let skippedDuplicate = 0;

  for (const row of csvData.rows) {
    const name = getMappedValue(csvData, mapping, row, "name");
    if (!name) { skippedNoName++; continue; }

    const phone = getMappedValue(csvData, mapping, row, "phone");
    if (phone) {
      const key = normalizePhoneBR(phone);
      if (existingPhoneKeys.has(key)) { skippedDuplicate++; continue; }
      existingPhoneKeys.add(key);
    }

    const tagsRaw = getMappedValue(csvData, mapping, row, "tags");
    const tags = tagsRaw ? tagsRaw.split(";").map((t) => t.trim()).filter(Boolean) : [];

    leadsToInsert.push({
      name,
      phone: phone || null,
      email: getMappedValue(csvData, mapping, row, "email") || null,
      company: getMappedValue(csvData, mapping, row, "company") || null,
      city: getMappedValue(csvData, mapping, row, "city") || null,
      position: getMappedValue(csvData, mapping, row, "position") || null,
      origin: getMappedValue(csvData, mapping, row, "origin") || "Importação",
      tags,
      column_id: columnId,
      client_id: clientId,
      custom_fields: buildCustomFields(row, csvData, mapping, defs),
      // Só inclui tenant_id se for UUID (master view usa "master" sentinela)
      ...tenantIdField(tenantId),
    });
  }

  return { leadsToInsert, skippedNoName, skippedDuplicate };
}
