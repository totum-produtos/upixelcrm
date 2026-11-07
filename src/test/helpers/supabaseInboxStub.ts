// Mock reutilizável do client Supabase para testes de UI.
// Toda cadeia de query builder (.from().select().eq()...) é "thenable" e resolve
// em { data: [], error: null }; nenhuma chamada de rede acontece.
import { vi } from "vitest";

interface QueryResult {
  data: unknown[];
  error: null;
  count: number;
}

const EMPTY_RESULT: QueryResult = { data: [], error: null, count: 0 };

function createChain(): object {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (value: QueryResult) => unknown) => Promise.resolve(EMPTY_RESULT).then(resolve);
      }
      if (prop === "single" || prop === "maybeSingle") {
        return () => Promise.resolve({ data: null, error: null });
      }
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

export function createSupabaseMock() {
  const channelObj = {
    on: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };
  channelObj.on.mockReturnValue(channelObj);
  channelObj.subscribe.mockReturnValue(channelObj);

  return {
    from: vi.fn(() => createChain()),
    rpc: vi.fn(() => createChain()),
    channel: vi.fn(() => channelObj),
    removeChannel: vi.fn(),
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: { invoke: vi.fn(async () => ({ data: null, error: null })) },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ data: null, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "" } })),
      })),
    },
  };
}
