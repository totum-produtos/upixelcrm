# ADR-UPX-005: Quality Gate obrigatório em PR

**Status:** Aceita (implementada em parte: gate em PR ativo, branch protection pendente)
**Data:** 2026-11-07

## Contexto
O `.github/workflows/deploy.yml` tem um job `ci` (lint, vitest, build), mas o workflow só dispara em `push` para `main` e `workflow_dispatch`. Nunca roda em `pull_request`. Resultado medido em 2026-11-07 (base `c3fa1d6`): `tsc --noEmit` com 8 erros, 5 testes falhando de 93 e 509 warnings de lint. O PR #120 (commit `0e56caf`) foi mergeado sem lint, teste ou tsc rodarem. O vitest não mede cobertura. Branch protection em `main` não está configurada, segundo o plano.

## Decisão
Todo PR para `main` precisa passar, antes do merge, em: lint com 0 erros, `tsc --noEmit` com 0 erros, testes 100% verdes e build. Cobertura entra em duas etapas: medir sem threshold (Fase 1) e depois ratchet por degraus 40%, 60%, 80% em `lib/`, `services/` e `hooks/` (Fase 3). Warnings de lint só podem diminuir. O check `ci` vira obrigatório por branch protection, configurada pelo Rael. O deploy de edge functions continua só no push para `main`.

## Implementação (2026-11-07)
- `.github/workflows/pr-ci.yml`: roda em todo PR para `main` (lint, `npm run typecheck`, `npm run test:coverage`, build). Edição de `.github/` autorizada pelo Rael em 2026-11-07.
- `deploy.yml`: job `ci` também roda `typecheck`.
- Baseline de cobertura medido: 4,33% das linhas em `lib/`, `services/` e `hooks/` (311 de 7176). Por isso o primeiro degrau do ratchet é ajustado para 10% (ver plano, Fase 3).
- Pendente: branch protection exigindo o check `quality-gate` (Rael).

## Consequências
- `main` precisa ficar verde antes de ligar o bloqueio (itens 1.2 e 1.3 do plano, o 1.3 toca auth e passa pelo Rael).
- Editar `.github/workflows/deploy.yml` exige OK explícito do Rael, pois `.github/` era intocável no plano de camadas.
- PRs ficam mais lentos, com meta de CI abaixo de 5 min na Fase 1.
- Metas dos KPIs estão na seção 4 do plano.

## Referências
- `.github/workflows/deploy.yml`, `vitest.config.ts`, `package.json`
- `docs/dev/PLANO-ADEQUACAO-BUILDOPS.md` (seções 1, 3 e 4)
- Commit `0e56caf` (PR #120), `c3fa1d6`
