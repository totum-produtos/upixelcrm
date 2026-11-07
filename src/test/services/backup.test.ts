import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockSupabase } from "../helpers/supabaseMock";

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase.client }));
vi.mock("@/lib/supabase-untyped", () => ({
  untypedFrom: (t: string) => mockSupabase.client.from(t),
  untypedRpc: (fn: string, a?: Record<string, unknown>) => mockSupabase.client.rpc(fn, a),
}));

import {
  getBackupStatus,
  listBackupRuns,
  saveBackupConfig,
  exportBackup,
  getBackupDownloadUrl,
  validateRestoreFile,
  executeRestore,
  compareBackupSchema,
} from "@/services/backup";

beforeEach(() => mockSupabase.reset());

type Opts = { body?: unknown; headers?: Record<string, string> };
const last = () => mockSupabase.invokeCalls()[mockSupabase.invokeCalls().length - 1];

describe("services/backup", () => {
  it("getBackupStatus, listBackupRuns e exportBackup chamam a action correta sem body", async () => {
    await getBackupStatus();
    expect(last().fn).toBe("database-backup?action=status");
    await listBackupRuns();
    expect(last().fn).toBe("database-backup?action=list");
    await exportBackup();
    expect(last().fn).toBe("database-backup?action=export");
    expect((last().options as Opts).body).toBeUndefined();
    expect((last().options as Opts).headers).toBeUndefined();
  });

  it("saveBackupConfig serializa o config como JSON com Content-Type", async () => {
    const config = { enabled: true, retention: 7 };
    await saveBackupConfig(config);
    expect(last().fn).toBe("database-backup?action=config-save");
    const opts = last().options as Opts;
    expect(JSON.parse(opts.body as string)).toEqual(config);
    expect(opts.headers).toEqual({ "Content-Type": "application/json" });
  });

  it("getBackupDownloadUrl codifica o path para evitar injecao de query", async () => {
    await getBackupDownloadUrl("a b/c&action=restore-execute");
    expect(last().fn).toBe("database-backup?action=download&path=a%20b%2Fc%26action%3Drestore-execute");
  });

  it("validateRestoreFile, executeRestore e compareBackupSchema enviam o arquivo em FormData", async () => {
    const file = new File(["{}"], "bk.json", { type: "application/json" });
    await validateRestoreFile(file);
    expect(last().fn).toBe("database-backup?action=restore-validate");
    await executeRestore(file);
    expect(last().fn).toBe("database-backup?action=restore-execute");
    await compareBackupSchema(file);
    expect(last().fn).toBe("database-backup?action=schema-compare");
    for (const c of mockSupabase.invokeCalls()) {
      const body = (c.options as Opts).body as FormData;
      expect(body).toBeInstanceOf(FormData);
      expect((body.get("file") as File).name).toBe("bk.json");
    }
  });

  it("repassa o resultado {data, error} da edge sem transformar", async () => {
    const err = new Error("falhou");
    mockSupabase.respondInvoke("database-backup?action=status", { data: { ok: 1 } }, { error: err });
    expect(await getBackupStatus()).toEqual({ data: { ok: 1 }, error: null });
    expect(await getBackupStatus()).toEqual({ data: null, error: err });
  });
});
