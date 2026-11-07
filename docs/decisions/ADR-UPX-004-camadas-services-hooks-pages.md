# ADR-UPX-004: Camadas services, hooks e pages

**Status:** Aceita
**Data:** 2026-11-07 (formaliza prática em andamento)

## Contexto
Havia queries Supabase espalhadas em hooks e páginas. A adequação por camadas (`totum-state.md`) criou repositórios por domínio em `src/services/` (leads, users, integrations, inbox, broadcast, automations e outros) e migrou hooks para eles. O Lote 1 e o Lote 2 foram concluídos em 2026-07-15, com build e lint verdes por movimento. O trabalho entrou pelo PR #37 (commit `906dd5f`).

Estado verificado hoje: `src/services/` tem 15 arquivos mais `shadow-sdr/`. Ainda há chamadas diretas `supabase.from/rpc` em 3 páginas: `src/pages/ImportPage.tsx`, `src/pages/UsersPage.tsx` e `src/pages/CampaignsPage.tsx`. `AUDITORIA-CAMADAS.md` registra também um vazamento em `WhatsAppManagement.tsx`, área sensível.

## Decisão
O fluxo de dependência é `pages/` para `hooks/` para `services/` para Supabase. Só `services/` fala com o Supabase. Páginas não chamam o cliente direto. Cada movimento de migração é 1 commit, 1 PR pequeno, com build, lint e teste após cada um, e reversão se quebrar.

## Consequências
- Mudança de schema fica concentrada em um arquivo por domínio, e os services são o alvo natural de testes unitários (Fase 3 do plano).
- Migração incompleta: as 3 páginas acima e `WhatsAppManagement.tsx` seguem como exceção até a Fase 4.
- `AppContext.tsx` (1184 linhas) e `InboxPage.tsx` (1740 linhas) cresceram desde o `TODO.md`. Refatorar só depois de haver testes.
- Fetches diretos a Evolution e Meta ficam fora dos services (regra do Lote 2, movimento 11).

## Referências
- `totum-state.md`, `AUDITORIA-CAMADAS.md`, `src/services/`
- PR #37, commit `906dd5f`
- `docs/dev/PLANO-ADEQUACAO-BUILDOPS.md` (Fase 4)
