import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "@/pages/LandingPage";
import LandingPageEN from "@/pages/LandingPageEN";

// Rede de segurança do refactor das landings: congela texto visível e links.
// Nenhum dos dois componentes importa o cliente Supabase, então não há mock.

function renderizar(ui: ReactElement) {
  const { container } = render(<MemoryRouter>{ui}</MemoryRouter>);
  const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
  return { texto: container.textContent, hrefs };
}

describe("Landing pages", () => {
  it("pt: texto visível e links", () => {
    const { texto, hrefs } = renderizar(<LandingPage />);
    expect(texto).toMatchSnapshot("texto");
    expect(hrefs).toMatchSnapshot("hrefs");
  });

  it("en: texto visível e links", () => {
    const { texto, hrefs } = renderizar(<LandingPageEN />);
    expect(texto).toMatchSnapshot("texto");
    expect(hrefs).toMatchSnapshot("hrefs");
  });
});
