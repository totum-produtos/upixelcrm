import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockSupabase } from "../helpers/supabaseMock";

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase.client }));
vi.mock("@/lib/supabase-untyped", () => ({
  untypedFrom: (t: string) => mockSupabase.client.from(t),
  untypedRpc: (fn: string, a?: Record<string, unknown>) => mockSupabase.client.rpc(fn, a),
}));

import {
  listRagDocumentsForClient,
  listAllRagDocuments,
  insertRagDocument,
  deleteRagDocument,
  getRagAnalyticsRaw,
  probeRagDocumentsTable,
  probeRagEmbeddingsTable,
  probeRagContextTable,
  uploadRagMediaFile,
  invokeAiChat,
  generateDocumentEmbeddings,
  searchSimilarDocuments,
} from "@/services/alexandria";

beforeEach(() => mockSupabase.reset());

describe("services/alexandria - rag_documents", () => {
  it("listRagDocumentsForClient filtra client_id, ordena e limita a 200", async () => {
    mockSupabase.respond("rag_documents", { data: [{ id: "d1" }] });
    expect(await listRagDocumentsForClient("c-1")).toEqual([{ id: "d1" }]);
    const calls = mockSupabase.callsFor("rag_documents");
    expect(calls).toContainEqual(["eq", "client_id", "c-1"]);
    expect(calls).toContainEqual(["limit", 200]);
  });

  it("listRagDocumentsForClient propaga erro e devolve [] com data nulo", async () => {
    expect(await listRagDocumentsForClient("c-1")).toEqual([]);
    mockSupabase.respond("rag_documents", { error: new Error("boom") });
    await expect(listRagDocumentsForClient("c-1")).rejects.toThrow("boom");
  });

  it("listAllRagDocuments nao filtra por client_id (visao global)", async () => {
    mockSupabase.respond("rag_documents", { data: [{ id: "a" }, { id: "b" }] });
    expect(await listAllRagDocuments()).toHaveLength(2);
    expect(mockSupabase.callsFor("rag_documents").filter((c) => c[0] === "eq")).toEqual([]);
  });

  it("listAllRagDocuments propaga erro", async () => {
    mockSupabase.respond("rag_documents", { error: new Error("x") });
    await expect(listAllRagDocuments()).rejects.toThrow("x");
  });

  it("insertRagDocument envia a linha e propaga erro", async () => {
    const row = { client_id: "c-1", title: "T", content: "C" } as never;
    await insertRagDocument(row);
    expect(mockSupabase.callsFor("rag_documents")).toContainEqual(["insert", row]);
    mockSupabase.respond("rag_documents", { error: new Error("ins") });
    await expect(insertRagDocument(row)).rejects.toThrow("ins");
  });

  it("deleteRagDocument deleta por id e propaga erro", async () => {
    await deleteRagDocument("d9");
    const calls = mockSupabase.callsFor("rag_documents");
    expect(calls.map((c) => c[0])).toContain("delete");
    expect(calls).toContainEqual(["eq", "id", "d9"]);
    mockSupabase.respond("rag_documents", { error: new Error("del") });
    await expect(deleteRagDocument("d9")).rejects.toThrow("del");
  });
});

describe("services/alexandria - analytics e probes", () => {
  it("getRagAnalyticsRaw agrega docs, contagem e scores", async () => {
    mockSupabase.respond("rag_documents", { data: [{ id: "1", type: "pdf" }] });
    mockSupabase.respond("rag_context", { data: [{ similarity_score: 0.5 }, { similarity_score: 0.9 }], count: 7 });
    const r = await getRagAnalyticsRaw();
    expect(r.docs).toEqual([{ id: "1", type: "pdf" }]);
    expect(r.ctxCount).toBe(7);
    expect(r.scores).toEqual([0.5, 0.9]);
  });

  it("getRagAnalyticsRaw usa defaults quando nao ha dados", async () => {
    expect(await getRagAnalyticsRaw()).toEqual({ docs: [], ctxCount: 0, scores: [] });
  });

  it("getRagAnalyticsRaw lanca quando docs falha", async () => {
    mockSupabase.respond("rag_documents", { error: new Error("docs") });
    await expect(getRagAnalyticsRaw()).rejects.toThrow("docs");
  });

  it("getRagAnalyticsRaw lanca quando a contagem de rag_context falha", async () => {
    mockSupabase.respond("rag_context", { error: new Error("ctx") });
    await expect(getRagAnalyticsRaw()).rejects.toThrow("ctx");
  });

  it("probes refletem ok/hasData", async () => {
    mockSupabase.respond("rag_documents", { data: [{ id: "1" }] });
    expect(await probeRagDocumentsTable()).toEqual({ ok: true, hasData: true });
    mockSupabase.respond("rag_embeddings", { data: [] });
    expect(await probeRagEmbeddingsTable()).toEqual({ ok: true, hasData: false });
    mockSupabase.respond("rag_context", { error: new Error("x") });
    expect(await probeRagContextTable()).toEqual({ ok: false });
    mockSupabase.respond("rag_documents", { error: new Error("x") });
    expect(await probeRagDocumentsTable()).toEqual({ ok: false, hasData: false });
  });
});

describe("services/alexandria - storage", () => {
  function stubStorage(uploadError: unknown) {
    const upload = vi.fn(async () => ({ data: null, error: uploadError }));
    const getPublicUrl = vi.fn(() => ({ data: { publicUrl: "https://cdn/x.pdf" } }));
    mockSupabase.client.storage.from.mockReturnValue({ upload, getPublicUrl } as never);
    return { upload, getPublicUrl };
  }

  it("uploadRagMediaFile envia ao bucket media e devolve a URL publica", async () => {
    const { upload, getPublicUrl } = stubStorage(null);
    const file = new File(["a"], "x.pdf");
    expect(await uploadRagMediaFile("c-1/x.pdf", file)).toEqual({ publicUrl: "https://cdn/x.pdf" });
    expect(mockSupabase.client.storage.from).toHaveBeenCalledWith("media");
    expect(upload).toHaveBeenCalledWith("c-1/x.pdf", file);
    expect(getPublicUrl).toHaveBeenCalledWith("c-1/x.pdf");
  });

  it("uploadRagMediaFile propaga erro de upload", async () => {
    stubStorage(new Error("quota"));
    await expect(uploadRagMediaFile("p", new File(["a"], "a"))).rejects.toThrow("quota");
  });
});

describe("services/alexandria - edge functions", () => {
  it("invokeAiChat envia o historico como messages", async () => {
    mockSupabase.respondInvoke("ai-chat", { data: { reply: "oi" } });
    const hist = [{ role: "user", content: "ola" }];
    expect(await invokeAiChat(hist)).toEqual({ data: { reply: "oi" }, error: null });
    expect(mockSupabase.invokeCalls()[0]).toEqual({ fn: "ai-chat", options: { body: { messages: hist } } });
  });

  it("generateDocumentEmbeddings devolve chunks e envia document_id", async () => {
    mockSupabase.respondInvoke("rag-embed", { data: { chunks: 4 } });
    expect(await generateDocumentEmbeddings("d1")).toEqual({ success: true, chunks: 4 });
    expect(mockSupabase.invokeCalls()[0].options).toEqual({ body: { document_id: "d1" } });
  });

  it("generateDocumentEmbeddings usa chunks=0 por padrao", async () => {
    expect(await generateDocumentEmbeddings("d1")).toEqual({ success: true, chunks: 0 });
  });

  it("generateDocumentEmbeddings lanca em error do invoke (com fallback) e em data.error", async () => {
    mockSupabase.respondInvoke("rag-embed", { error: { message: "" } });
    await expect(generateDocumentEmbeddings("d1")).rejects.toThrow("Failed to generate embeddings");
    mockSupabase.respondInvoke("rag-embed", { error: { message: "net" } });
    await expect(generateDocumentEmbeddings("d1")).rejects.toThrow("net");
    mockSupabase.respondInvoke("rag-embed", { data: { error: "bad doc" } });
    await expect(generateDocumentEmbeddings("d1")).rejects.toThrow("bad doc");
  });

  it("searchSimilarDocuments usa limit=5 e threshold=0.3 por padrao", async () => {
    mockSupabase.respondInvoke("rag-search", { data: { results: [{ documentId: "d" }] } });
    expect(await searchSimilarDocuments("q")).toEqual([{ documentId: "d" }]);
    expect(mockSupabase.invokeCalls()[0].options).toEqual({ body: { query: "q", limit: 5, threshold: 0.3 } });
  });

  it("searchSimilarDocuments respeita parametros, devolve [] sem results e propaga erros", async () => {
    await searchSimilarDocuments("q", 2, 0.8);
    expect(mockSupabase.invokeCalls()[0].options).toEqual({ body: { query: "q", limit: 2, threshold: 0.8 } });
    expect(await searchSimilarDocuments("q")).toEqual([]);
    mockSupabase.respondInvoke("rag-search", { error: { message: "" } });
    await expect(searchSimilarDocuments("q")).rejects.toThrow("Search failed");
    mockSupabase.respondInvoke("rag-search", { data: { error: "quota" } });
    await expect(searchSimilarDocuments("q")).rejects.toThrow("quota");
  });
});
