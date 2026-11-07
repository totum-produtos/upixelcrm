# ADR-UPX-006: Preview Vercel como ambiente canário

**Status:** Proposta
**Data:** 2026-11-07

## Contexto
A Vercel publica um preview a cada PR (integração GitHub, ver cabeçalho de `.github/workflows/deploy.yml`). Hoje esse preview só prova que o build passa. Não há canário de tráfego nem blue-green, o que é aceitável para o porte. O Playwright está instalado, mas `playwright.config.ts` e `playwright-fixture.ts` são template do Lovable e existem 0 testes E2E. Fluxos críticos (login, signup com tenant, criar lead, mover no pipeline, enviar mensagem no inbox) não têm cobertura automática. Como o preview usa o mesmo projeto Supabase de produção (`vercel.json` e `supabase/config.toml` apontam o mesmo ref), o teste precisa de cuidado com dados.

## Decisão
O preview da Vercel de cada PR é o ambiente canário. Um smoke E2E com Playwright, cobrindo os 5 fluxos críticos, roda contra a URL do preview antes do merge. Sem E2E verde, o PR não é mergeado. Rollback segue `docs/ROLLBACK.md`.

## Consequências
- É preciso trocar a config Playwright do Lovable e criar `e2e/` (item 3.3 do plano).
- A estratégia de dados do E2E fica a definir: tenant de teste dedicado ou outro projeto Supabase. Decisão de banco pertence ao Rael (A CONFIRMAR).
- Variáveis de ambiente do preview na Vercel precisam estar completas (A CONFIRMAR pelo Rael).
- CI com E2E deve ficar abaixo de 15 min.

## Referências
- `vercel.json`, `playwright.config.ts`, `playwright-fixture.ts`, `docs/ROLLBACK.md`
- `docs/dev/PLANO-ADEQUACAO-BUILDOPS.md` (Fase 3, item 3.3)
