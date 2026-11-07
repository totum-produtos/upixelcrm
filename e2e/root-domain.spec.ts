import { test, expect, ROOT_URL } from "./fixtures";

// Domínio raiz (sem tenant): landing, /en, login orientativo e aliases de cadastro.
// Nenhum fluxo aqui precisa de backend.

const ERROR_BOUNDARY_TEXT = "Algo deu errado";

test.describe("domínio raiz", () => {
  test("landing renderiza o conteúdo principal", async ({ page }) => {
    await page.goto(`${ROOT_URL}/`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Atendimento, funil e IA no mesmo painel." }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Solicitar demonstração" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Inbox comercial" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Funil de vendas" })).toBeVisible();
    await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0);
  });

  test("landing em inglês (/en) renderiza sem quebrar", async ({ page }) => {
    await page.goto(`${ROOT_URL}/en`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0);
  });

  test("rota desconhecida no domínio raiz cai na landing (comportamento atual)", async ({ page }) => {
    await page.goto(`${ROOT_URL}/rota-que-nao-existe`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Atendimento, funil e IA no mesmo painel." }),
    ).toBeVisible();
    await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0);
  });

  test("/login no domínio raiz orienta a entrar pelo workspace", async ({ page }) => {
    await page.goto(`${ROOT_URL}/login`);
    await expect(page.getByRole("heading", { name: "Entre pela sua empresa" })).toBeVisible();

    const continuar = page.getByRole("button", { name: "Continuar" });
    await expect(continuar).toBeDisabled();

    // Só digita: normaliza o slug e mostra o destino, sem clicar em Continuar
    // (clicar navegaria para outro host).
    await page.getByLabel("Endereço da sua empresa").fill("Acme");
    await expect(continuar).toBeEnabled();
    await expect(page.getByText("acme.localhost/login")).toBeVisible();
    await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0);
  });

  test("link Entrar da landing leva a /login", async ({ page }) => {
    await page.goto(`${ROOT_URL}/`);
    await page.getByRole("link", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Entre pela sua empresa" })).toBeVisible();
  });
});
