import { test, expect, mockTenantResolution, TENANT_URL } from "./fixtures";

// Rotas de tenant (acme.upixel.app). A única coisa simulada é a leitura que resolve o
// tenant (ver mockTenantResolution); todo o resto do backend permanece inalcançável.
// Nunca enviamos credenciais válidas: só validação client-side e redirecionamentos.

const ERROR_BOUNDARY_TEXT = "Algo deu errado";

test.describe("tenant sem cadastro no banco", () => {
  test("subdomínio desconhecido mostra 'Empresa não encontrada'", async ({ page }) => {
    // Sem mock: o backend falso recusa a conexão, o app trata como tenant inexistente.
    await page.goto(`${TENANT_URL}/login`);
    await expect(page.getByRole("heading", { name: "Empresa não encontrada" })).toBeVisible();
    await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0);
  });
});

test.describe("tenant resolvido", () => {
  test.beforeEach(async ({ page }) => {
    await mockTenantResolution(page);
  });

  test("login renderiza e envio vazio é barrado pela validação nativa", async ({ page }) => {
    await page.goto(`${TENANT_URL}/login`);
    await expect(page.getByRole("heading", { name: "Acessar uPixel" })).toBeVisible();

    const email = page.getByLabel("E-mail");
    const senha = page.getByLabel("Senha", { exact: true });
    await expect(email).toBeVisible();
    await expect(senha).toBeVisible();

    await page.getByRole("button", { name: "Entrar" }).click();

    // Campos "required" vazios: o navegador bloqueia o submit (nenhuma chamada de rede).
    expect(await email.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
    expect(await senha.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0);
  });

  test("login: e-mail em formato inválido é barrado pela validação nativa", async ({ page }) => {
    await page.goto(`${TENANT_URL}/login`);
    const email = page.getByLabel("E-mail");
    await email.fill("isto-nao-e-email");
    await page.getByLabel("Senha", { exact: true }).fill("qualquer-coisa");
    await page.getByRole("button", { name: "Entrar" }).click();
    expect(await email.evaluate((el: HTMLInputElement) => el.validity.typeMismatch)).toBe(true);
    await expect(page).toHaveURL(/\/login$/);
  });

  test("login por Magic Link: e-mail inválido mostra a mensagem do app", async ({ page }) => {
    await page.goto(`${TENANT_URL}/login`);
    await page.getByRole("button", { name: "Magic Link" }).click();
    await page.getByLabel("E-mail").fill("isto-nao-e-email");
    await page.getByRole("button", { name: "Enviar Magic Link" }).click();
    // Validação client-side (EMAIL_REGEX): barra antes de qualquer chamada ao backend.
    await expect(page.getByText("Informe um e-mail válido.")).toBeVisible();
    await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0);
  });

  for (const rota of ["/", "/crm", "/inbox", "/tasks", "/settings"]) {
    test(`rota protegida ${rota} redireciona para /login quando deslogado`, async ({ page }) => {
      await page.goto(`${TENANT_URL}${rota}`);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("heading", { name: "Acessar uPixel" })).toBeVisible();
      await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0);
    });
  }

  test("/dashboard redireciona para a raiz e depois para /login", async ({ page }) => {
    await page.goto(`${TENANT_URL}/dashboard`);
    await expect(page).toHaveURL(/\/login$/);
  });

  test("rota desconhecida mostra a página 404", async ({ page }) => {
    await page.goto(`${TENANT_URL}/rota-que-nao-existe`);
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
    await expect(page.getByText("Erro 404")).toBeVisible();
    await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0);
  });
});
