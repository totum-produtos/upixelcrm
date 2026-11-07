import { vi } from "vitest";

/**
 * Mock compartilhado do cliente Supabase para testes que importam, direta ou
 * indiretamente, "@/integrations/supabase/client" (ex.: lib/logger).
 *
 * Uso:
 *   vi.mock("@/integrations/supabase/client", async () =>
 *     (await import("@/test/helpers/supabaseModuleStub")).supabaseModuleMock());
 */

type QueryResult = { data: unknown; error: null };

/** Builder encadeavel e "thenable": qualquer metodo devolve o proprio builder. */
function createQueryBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  for (const method of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "in", "is",
    "order", "limit", "range", "single", "maybeSingle", "match", "or", "not",
  ]) {
    builder[method] = vi.fn(chain);
  }
  builder.then = (resolve: (value: QueryResult) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

export function createSupabaseMock() {
  const empty: QueryResult = { data: [], error: null };
  return {
    from: vi.fn(() => createQueryBuilder(empty)),
    rpc: vi.fn(() => Promise.resolve(empty)),
    functions: { invoke: vi.fn(() => Promise.resolve(empty)) },
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  };
}

export function supabaseModuleMock() {
  return { supabase: createSupabaseMock() };
}
