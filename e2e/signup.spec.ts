import { test, expect, ROOT_URL } from "./fixtures";

// Cadastro (/cadastro) no domínio raiz. Nunca envia o formulário: só renderização e
// validação client-side. A etapa "gate" chamaria o backend ao enviar, então não é enviada.

const ERROR_BOUNDARY_TEXT = "Algo deu errado";

test.describe("cadastro", () => {
  test("/cadastro mostra o gate de senha e bloqueia o envio vazio", async ({ page }) => {
    await page.goto(`${ROOT_URL}/cadastro`);
    await expect(page.getByRole("heading", { name: "Área restrita" })).toBeVisible();
    await expect(page.getByLabel("Senha de acesso")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();

    await page.getByLabel("Senha de acesso").fill("qualquer");
    await expect(page.getByRole("button", { name: "Continuar" })).toBeEnabled();
    await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0);
  });

  test("aliases /signup, /sign-up e /register redirecionam para /cadastro", async ({ page }) => {
    for (const alias of ["/signup", "/sign-up", "/register"]) {
      await page.goto(`${ROOT_URL}${alias}`);
      await expect(page).toHaveURL(/\/cadastro$/);
      await expect(page.getByRole("heading", { name: "Área restrita" })).toBeVisible();
    }
  });

  test.describe("formulário", () => {
    // Pula o gate só no front (sessionStorage), sem nenhuma chamada de rede.
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => sessionStorage.setItem("upixel.signup.gate", "1"));
    });

    test("renderiza os campos e mantém o envio desabilitado enquanto vazio", async ({ page }) => {
      await page.goto(`${ROOT_URL}/cadastro`);
      await expect(page.getByRole("heading", { name: "Cadastrar novo cliente" })).toBeVisible();
      for (const label of ["Nome do responsável", "Nome da empresa", "Subdomínio", "E-mail", "Senha"]) {
        await expect(page.getByLabel(label, { exact: true })).toBeVisible();
      }
      await expect(page.getByRole("button", { name: "Criar conta do cliente" })).toBeDisabled();
      await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0);
    });

    test("subdomínio inválido mostra a mensagem de validação e não habilita o envio", async ({ page }) => {
      await page.goto(`${ROOT_URL}/cadastro`);
      await page.getByLabel("Nome do responsável").fill("Pessoa Teste");
      await page.getByLabel("Nome da empresa").fill("Empresa Teste");
      await page.getByLabel("E-mail", { exact: true }).fill("pessoa@example.com");
      await page.getByLabel("Senha", { exact: true }).fill("123456");
      // "a" é curto demais para o regex de subdomínio (validação 100% local, sem consulta).
      await page.getByLabel("Subdomínio").fill("a");
      await expect(
        page.getByText("Use apenas letras minúsculas, números e hífens (mín. 3 caracteres)"),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Criar conta do cliente" })).toBeDisabled();
    });

    test("subdomínio é normalizado para minúsculas e sem caracteres inválidos", async ({ page }) => {
      await page.goto(`${ROOT_URL}/cadastro`);
      await page.getByLabel("Subdomínio").fill("A_c M!e");
      await expect(page.getByLabel("Subdomínio")).toHaveValue("acme");
    });

    test("senha curta é recusada pela validação nativa do campo", async ({ page }) => {
      await page.goto(`${ROOT_URL}/cadastro`);
      const senha = page.getByLabel("Senha", { exact: true });
      await senha.fill("123");
      expect(await senha.evaluate((el: HTMLInputElement) => el.validity.tooShort)).toBe(true);
    });
  });
});
