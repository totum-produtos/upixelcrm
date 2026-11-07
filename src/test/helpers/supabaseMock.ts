import { vi } from "vitest";

/**
 * Mock encadeável do cliente Supabase para testes de `src/services/*`.
 *
 * Uso:
 *   vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase.client }));
 *   vi.mock("@/lib/supabase-untyped", () => ({
 *     untypedFrom: (t: string) => mockSupabase.client.from(t),
 *     untypedRpc: (fn: string, a?: unknown) => mockSupabase.client.rpc(fn, a),
 *   }));
 *   beforeEach(() => mockSupabase.reset());
 *
 *   mockSupabase.respond("leads", { data: [...], error: null });
 *   await listLeads("t-1");
 *   expect(mockSupabase.callsFor("leads")).toContainEqual(["eq", "client_id", "t-1"]);
 *
 * Cada `from(table)` cria uma query que grava todas as chamadas encadeadas
 * (select, eq, in, order, insert, update, delete...) e, ao ser aguardada,
 * resolve com a resposta configurada para a tabela (ou `{ data: null, error: null }`).
 */

export interface MockResult {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}

type Call = [string, ...unknown[]];

const CHAIN_METHODS = [
  "select", "insert", "update", "upsert", "delete",
  "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in",
  "contains", "containedBy", "overlaps", "match", "not", "or", "filter",
  "order", "limit", "range", "returns", "throwOnError", "textSearch",
];

function createState() {
  return {
    responses: new Map<string, MockResult[]>(),
    calls: new Map<string, Call[][]>(),
    rpcResponses: new Map<string, MockResult[]>(),
    rpcCalls: [] as Array<{ fn: string; args: unknown }>,
    invokeResponses: new Map<string, MockResult[]>(),
    invokeCalls: [] as Array<{ fn: string; options: unknown }>,
  };
}

let state = createState();

function nextResult(map: Map<string, MockResult[]>, key: string): MockResult {
  const queue = map.get(key);
  if (!queue || queue.length === 0) return { data: null, error: null };
  // A última resposta configurada vale para todas as chamadas seguintes.
  return queue.length > 1 ? (queue.shift() as MockResult) : queue[0];
}

function buildQuery(table: string) {
  const calls: Call[] = [];
  const list = state.calls.get(table) ?? [];
  list.push(calls);
  state.calls.set(table, list);

  const resolve = () => {
    const r = nextResult(state.responses, table);
    return { data: r.data ?? null, error: r.error ?? null, count: r.count ?? null };
  };

  const query: Record<string, unknown> = {};
  for (const m of CHAIN_METHODS) {
    query[m] = vi.fn((...args: unknown[]) => {
      calls.push([m, ...args]);
      return query;
    });
  }
  for (const terminal of ["single", "maybeSingle", "csv"]) {
    query[terminal] = vi.fn((...args: unknown[]) => {
      calls.push([terminal, ...args]);
      return Promise.resolve(resolve());
    });
  }
  query.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(resolve()).then(onFulfilled, onRejected);
  return query;
}

export const mockSupabase = {
  client: {
    from: vi.fn((table: string) => buildQuery(table)),
    rpc: vi.fn((fn: string, args?: unknown) => {
      state.rpcCalls.push({ fn, args });
      const r = nextResult(state.rpcResponses, fn);
      const p = Promise.resolve({ data: r.data ?? null, error: r.error ?? null });
      return Object.assign(p, {
        single: () => p,
        maybeSingle: () => p,
      });
    }),
    functions: {
      invoke: vi.fn((fn: string, options?: unknown) => {
        state.invokeCalls.push({ fn, options });
        const r = nextResult(state.invokeResponses, fn);
        return Promise.resolve({ data: r.data ?? null, error: r.error ?? null });
      }),
    },
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ data: null, error: null })),
        createSignedUrl: vi.fn(async () => ({ data: null, error: null })),
        remove: vi.fn(async () => ({ data: null, error: null })),
      })),
    },
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },

  /** Configura a(s) resposta(s) de uma tabela. Várias = uma por chamada, a última se repete. */
  respond(table: string, ...results: MockResult[]) {
    state.responses.set(table, results);
  },
  respondRpc(fn: string, ...results: MockResult[]) {
    state.rpcResponses.set(fn, results);
  },
  respondInvoke(fn: string, ...results: MockResult[]) {
    state.invokeResponses.set(fn, results);
  },

  /** Todas as chamadas encadeadas feitas em queries da tabela (achatadas). */
  callsFor(table: string): Call[] {
    return (state.calls.get(table) ?? []).flat();
  },
  /** Chamadas por query (uma lista por `from(table)`). */
  queriesFor(table: string): Call[][] {
    return state.calls.get(table) ?? [];
  },
  rpcCalls() {
    return state.rpcCalls;
  },
  invokeCalls() {
    return state.invokeCalls;
  },

  reset() {
    state = createState();
    mockSupabase.client.from.mockClear();
    mockSupabase.client.rpc.mockClear();
    mockSupabase.client.functions.invoke.mockClear();
  },
};
