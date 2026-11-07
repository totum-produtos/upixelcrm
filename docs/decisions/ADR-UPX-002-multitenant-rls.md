# ADR-UPX-002: Multi-tenant por subdomínio com RLS

**Status:** Aceita
**Data:** 2026-11-07 (formaliza prática existente)

## Contexto
O produto é um CRM SaaS em que cada cliente acessa por subdomínio. O `README.md` e o `CLAUDE.md` descrevem o isolamento por `tenant_id` via RLS. O `TENANT_PLAN.md` mostra a história: o isolamento nasceu com `client_id` (TEXT), foi criada a tabela `tenants` com `subdomain`, e `client_id = tenant_id::text` manteve a retrocompatibilidade com `get_user_client_id()`.

Evidências de que o modelo é sensível e já teve falhas:
- Commit `41d7c3f` (RLS hotfix de isolamento por tenant) e `5b9e5d2` (`handle_new_user` não confia em `user_metadata`).
- Série de correções de segurança cb-01 a cb-10 (ex.: `1c43f8d` bloqueia usuário pendente via RLS, `ff0fa6c` restringe insert em notifications ao mesmo tenant).
- `AUDITORIA-CAMADAS.md` confirma RLS em 49+ tabelas, com 6 tabelas sem arquivo de migration local.

## Decisão
O isolamento entre clientes é feito no banco, por RLS com `tenant_id`, e não no frontend. O frontend só deriva o tenant do subdomínio (`src/lib/tenant-utils.ts`). Toda mudança em RLS, Auth, Storage ou schema de produção é No-Fly Zone: a IA propõe, o Rael aprova o diff antes do push.

## Consequências
- A segurança não depende de filtros no cliente, mas depende de cada tabela nova nascer com RLS e policy.
- Correções de teste que tocam `src/lib/auth-access.ts` (caso `cb01-pending-user-tenant-block`) também passam pelo Rael.
- Débito: tabelas em produção sem migration rastreada e `supabase/migrations-pending/20260821_add_lead_slug.sql` nunca aplicada. Precisa de decisão explícita.
- Divergência de domínio a resolver: `README.md` cita `upixel.com.br`, `docs/CLOUDFLARE_PAGES.md` cita `upixel.app`. Confirmar o domínio de produção.

## Referências
- `CLAUDE.md` (No-Fly Zones, Arquitetura Multi-Tenant), `README.md`, `TENANT_PLAN.md`
- `AUDITORIA-CAMADAS.md` (camadas 3, 4 e 8), `src/lib/tenant-utils.ts`
- Commits `41d7c3f`, `5b9e5d2`, `1c43f8d`, `ff0fa6c`
