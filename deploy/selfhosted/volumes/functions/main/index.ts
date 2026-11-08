// Roteador (main service) do edge-runtime self-hosted: /functions/v1/<nome> chega
// aqui como /<nome> e é servido por um worker de /home/deno/functions/<nome>.
// Faz o papel do verify_jwt do Supabase Cloud.
import { functionName, PUBLIC_FUNCTIONS, verifyJwt } from "./auth.ts";

declare const EdgeRuntime: {
  userWorkers: { create(opts: Record<string, unknown>): Promise<{ fetch(req: Request): Promise<Response> }> };
};

const JWT_SECRET = Deno.env.get("JWT_SECRET") ?? "";
const VERIFY_JWT = Deno.env.get("VERIFY_JWT") !== "false";
const FUNCTIONS_ROOT = Deno.env.get("FUNCTIONS_ROOT") ?? "/home/deno/functions";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  const name = functionName(new URL(req.url).pathname);
  if (!name) return json(400, { msg: "missing function name in request" });

  // OPTIONS passa sem token: preflight CORS do navegador nunca leva Authorization.
  if (VERIFY_JWT && req.method !== "OPTIONS" && !PUBLIC_FUNCTIONS.has(name)) {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!(await verifyJwt(token, JWT_SECRET))) return json(401, { msg: "Invalid JWT" });
  }

  try {
    const worker = await EdgeRuntime.userWorkers.create({
      servicePath: `${FUNCTIONS_ROOT}/${name}`,
      memoryLimitMb: 256,
      workerTimeoutMs: 5 * 60 * 1000,
      noModuleCache: false,
      importMapPath: null,
      envVars: Object.entries(Deno.env.toObject()),
      forceCreate: false,
      netAccessDisabled: false,
      cpuTimeSoftLimitMs: 10_000,
      cpuTimeHardLimitMs: 20_000,
    });
    return await worker.fetch(req);
  } catch (e) {
    console.error(`worker ${name} failed:`, e);
    return json(500, { msg: `function ${name} failed to start` });
  }
});
