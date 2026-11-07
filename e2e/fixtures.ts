import { test as base, expect, type Page } from "@playwright/test";

// Hosts de teste: o Chromium os resolve para 127.0.0.1 (ver playwright.config.ts).
const PREVIEW_PORT = "4173";
const ROOT_HOST = "upixel.app";
const TENANT_HOST = "acme.upixel.app";
const FAKE_BACKEND = "http://127.0.0.1:9";
const ALLOWED_PREVIEW_HOSTS = new Set(["127.0.0.1", ROOT_HOST, TENANT_HOST]);

export const ROOT_URL = `http://${ROOT_HOST}:${PREVIEW_PORT}`;
export const TENANT_URL = `http://${TENANT_HOST}:${PREVIEW_PORT}`;

// Origens que o app pode acessar durante o E2E: apenas o próprio preview
// (por 127.0.0.1 ou pelos hosts de teste) e o "backend" falso em porta fechada.
function isAllowed(rawUrl: string): boolean {
  const url = new URL(rawUrl);
  if (url.protocol === "data:" || url.protocol === "blob:") return true;
  if (url.origin === FAKE_BACKEND) return true;
  return ALLOWED_PREVIEW_HOSTS.has(url.hostname) && url.port === PREVIEW_PORT;
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "*",
};

// Guarda: bloqueia qualquer request fora da allowlist e registra a violação.
// O afterEach abaixo faz o teste falhar se houve alguma.
async function installNetworkGuard(page: Page, violations: string[]) {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    // Fontes do Google (CSS no index.html) são só estáticos de CDN: respondemos vazio
    // localmente, sem sair da máquina. O app cai nas fontes do sistema.
    const host = new URL(url).hostname;
    if (host === "fonts.googleapis.com" || host === "fonts.gstatic.com") {
      return route.fulfill({ status: 200, contentType: "text/css", body: "" });
    }
    if (!isAllowed(url)) {
      violations.push(url);
      return route.abort("blockedbyclient");
    }
    return route.fallback();
  });
}

// Simula SOMENTE a resolução do tenant "acme" (leituras de organizations/tenants),
// para o app renderizar as rotas de tenant. Respostas 100% falsas e locais; qualquer
// outra chamada ao backend falso é derrubada (conexão recusada, como numa porta fechada).
export async function mockTenantResolution(page: Page) {
  const tenant = {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Acme E2E",
    subdomain: "acme",
    plan: "free",
    owner_id: null,
    is_active: true,
    created_at: "2020-01-01T00:00:00Z",
    updated_at: "2020-01-01T00:00:00Z",
  };
  await page.route(`${FAKE_BACKEND}/**`, (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: CORS });
    }
    const path = new URL(req.url()).pathname;
    if (req.method() === "GET" && path === "/rest/v1/organizations") {
      return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: "[]" });
    }
    if (req.method() === "GET" && path === "/rest/v1/tenants") {
      return route.fulfill({
        status: 200,
        headers: CORS,
        contentType: "application/json",
        body: JSON.stringify([tenant]),
      });
    }
    return route.abort("connectionrefused");
  });
}

export const test = base.extend<{ violations: string[] }>({
  // auto: o guard fica ativo em todo teste, mesmo que ele não peça a fixture.
  violations: [
    async ({ page }, use) => {
      const violations: string[] = [];
      await installNetworkGuard(page, violations);
      await use(violations);
      expect(violations, "E2E tentou acessar um host fora da allowlist (backend real?)").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
