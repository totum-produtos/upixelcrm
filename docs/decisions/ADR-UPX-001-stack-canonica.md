# ADR-UPX-001: Stack canônica

**Status:** Aceita
**Data:** 2026-11-07 (formaliza prática existente)

## Contexto
O `CLAUDE.md` lista a stack, mas dizia "Vercel (implied)" para o deploy. O repositório confirma o que roda de fato:
- Frontend servido pela Vercel: `vercel.json` (rewrites SPA, headers de segurança) e o cabeçalho de `.github/workflows/deploy.yml` ("Frontend em produção é servido pela VERCEL").
- Edge functions Supabase: 33 pastas em `supabase/functions/`, deployadas por GitHub Actions (job `deploy-functions`, `supabase functions deploy --use-api`).
- O job `deploy-vps` foi removido em 2026-07-19 por estar quebrado (timeout SSH) e obsoleto. `docs/CLOUDFLARE_PAGES.md` descreve uma alternativa que não é a produção atual.
- O `vercel.json` repassa `/functions/v1/*` para o projeto Supabase `xusdhzwfkzufupjwbebt`, o mesmo de `supabase/config.toml`.

## Decisão
A stack canônica é: React 18 + Vite + TypeScript strict + Tailwind + shadcn/ui, TanStack Query, React Hook Form + Zod, Supabase (Postgres, Auth, Realtime, Edge Functions) e Vercel para o frontend. Edge functions são deployadas apenas pelo workflow do GitHub Actions, nunca à mão. Trocar qualquer peça exige novo ADR.

## Consequências
- Agentes e pessoas têm uma única fonte para "o que usamos".
- O `CLAUDE.md` deve trocar "Vercel (implied)" por "Vercel (confirmado)" (item 2.4 do plano).
- Há um segundo documento de deploy (`docs/CLOUDFLARE_PAGES.md`) que pode confundir. Deve ser marcado como histórico (item 2.2 do plano).
- Migrations não passam pelo CI hoje (`AUDITORIA-CAMADAS.md`, camada 7). Fica como débito.

## Referências
- `CLAUDE.md`, `vercel.json`, `supabase/config.toml`, `.github/workflows/deploy.yml`
- `totum-state.md`, `AUDITORIA-CAMADAS.md` (camadas 5 e 7)
- Commit `c97144f` (ajuste do rewrite SPA na Vercel), `fa68617` (headers de segurança no `vercel.json`)
