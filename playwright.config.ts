import { defineConfig, devices } from "@playwright/test";

// Config E2E do uPixel CRM.
// Regra de ouro: E2E NUNCA toca em banco. Não existe Supabase de staging e produção
// não pode receber dado de teste. Por isso o build do app aponta para uma porta fechada
// (127.0.0.1:9): qualquer chamada de rede ao "backend" falha na hora e nada é gravado.
// Os testes ainda bloqueiam, via fixture, qualquer request para fora do próprio preview.

const PORT = 4173;

// Sempre 127.0.0.1, nunca "localhost" (problema conhecido de IPv6).
const BASE_URL = `http://127.0.0.1:${PORT}`;

// getTenantSubdomain() trata "127.0.0.1" como subdomínio "127". Para exercitar o domínio
// raiz e um tenant, o Chromium resolve hosts de teste para 127.0.0.1 via host-resolver-rules.
// Todo o resto vira ~NOTFOUND (defesa em profundidade contra tráfego externo).
// Estes hosts são repetidos em e2e/fixtures.ts (mantenha os dois em sincronia).
const ROOT_HOST = "upixel.app";
const TENANT_HOST = "acme.upixel.app";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "off",
    launchOptions: {
      args: [
        `--host-resolver-rules=MAP ${ROOT_HOST} 127.0.0.1, MAP ${TENANT_HOST} 127.0.0.1, MAP * ~NOTFOUND, EXCLUDE 127.0.0.1`,
      ],
      // Permite apontar para um Chromium já instalado (ex.: /opt/pw-browsers/chromium).
      executablePath: process.env.E2E_CHROMIUM_PATH || undefined,
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Preview do build de produção: mais fiel ao que vai ao ar e sem HMR/websocket do dev server.
  // Usa "vite build" direto (e não "npm run build") para pular o prebuild que reescreve
  // public/sw.js; o resultado do build é o mesmo.
  webServer: {
    command: `npx vite build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      VITE_SUPABASE_URL: "http://127.0.0.1:9",
      VITE_SUPABASE_PUBLISHABLE_KEY: "e2e-dummy-key",
      VITE_ROOT_DOMAIN: "localhost",
    },
  },
});
