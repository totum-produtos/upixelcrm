# PROJECT CARD: uPixel CRM

**Atualizado:** 2026-11-07 (base `main` @ `9d9f572`)
**Classificação:** Produção (CLAUDE.md)

## Objetivo
CRM SaaS multi-tenant por subdomínio para gestão de vendas e atendimento (funil, inbox WhatsApp, automações, campanhas). Entrega a pequenas e médias empresas um CRM simples e rápido, com isolamento de dados por cliente.

## Usuários
- Gestores comerciais, vendedores e equipes de atendimento de PMEs (fonte: `CLAUDE.md`).
- Admin master da plataforma (`is_master_user()`, ver `docs/dev/TENANT_PLAN.md`).

## Stack
React 18, TypeScript strict, Vite, Tailwind, shadcn/ui, TanStack Query, React Hook Form + Zod, Recharts, React Flow, dnd-kit. Backend Supabase (Postgres, Auth, Realtime, 33 edge functions). Testes com Vitest e Playwright (sem testes E2E ainda). Detalhes e justificativa: `docs/decisions/ADR-UPX-001-stack-canonica.md`.

## Ambientes

| Ambiente | Onde | Observação |
|---|---|---|
| Produção (frontend) | Vercel, deploy automático no push para `main` | `vercel.json` na raiz |
| Produção (backend) | **Supabase self-hosted** na VPS Nova, `https://upixel.grupototum.com`, stack `/opt/upixel-supabase` (projeto compose `upixel-selfhosted`) | confirmado em 2026-11-08 pelo bundle de produção (chave anon sem `ref`) |
| Edge functions | container `upixel-functions` na VPS, código em `/opt/upixel-supabase/functions` | **deploy manual** (rsync + `docker restart upixel-functions`). O `deploy.yml` ainda publica no Cloud, que a produção não usa |
| Supabase Cloud (`xusdhzwfkzufupjwbebt`) | legado, a desativar | não serve produção. Ver checklist de desligamento em `deploy/selfhosted/README.md` |
| Preview | Vercel, um preview por PR | hoje só valida o build (ver ADR-UPX-006, proposta) |
| Local | `npm run dev`, subdomínios via `/etc/hosts` | ver `CLAUDE.md` |

- URL de produção do frontend: A CONFIRMAR (Rael).
- Domínio raiz: `README.md` cita `upixel.com.br`, `docs/CLOUDFLARE_PAGES.md` cita `upixel.app`. A CONFIRMAR (Rael).
- Projeto Vercel (nome e time): A CONFIRMAR (Rael).
- Existe projeto Supabase separado de staging? A CONFIRMAR (Rael). O preview usa o mesmo projeto de produção, segundo a configuração do repo.
- Variáveis de ambiente: nomes em `CLAUDE.md`; valores ficam em Vercel, GitHub Secrets e Supabase. Nunca no repo.

## Repositório
https://github.com/totum-produtos/upixelcrm (o `CLAUDE.md` ainda aponta `grupototum/upixelcrm`, desatualizado). Fluxo: 1 movimento = 1 commit = 1 PR pequeno (`docs/history/totum-state.md`).

## Donos

| Papel | Pessoa |
|---|---|
| Dono e aprovador (RLS, auth, tenant, deploy) | Rael |
| Revisão técnica | Kleber (autor dos commits de segurança cb-01 a cb-10, ver `git log`; também aparece como revisor em `docs/CONTRIBUTING.md`) |
| Vault e segredos | Sentinela (ADR-UPX-003) |
| Tech Lead da adequação | Claude |
| Papel formal de Kleber no projeto | A CONFIRMAR (Rael) |
| Responsável por suporte e incidentes | A CONFIRMAR (Rael) |

Regra: IA sugere, humano aprova nas No-Fly Zones do `CLAUDE.md`.

## SLAs da adequação (plano, seção 4)

| Indicador | Hoje | Fase 1 | Fase 3 | Fase 4 |
|---|---|---|---|---|
| Erros tsc | 8 | 0 | 0 | 0 |
| Testes falhando | 5 | 0 | 0 | 0 |
| Cobertura (lib/services/hooks) | 4,33% (medida 2026-11-07) | medida | ≥ 80% | ≥ 80% |
| E2E fluxos críticos | 0 | 0 | 5 | 5 |
| Warnings lint | 509 | ≤ 509 (ratchet) | ≤ 400 | ≤ 150 |
| CI em PR | sim (pr-ci.yml, 2026-11-07) | sim, < 5 min | < 15 min com E2E | < 15 min |
| `.md` na raiz | 29 | 29 | ≤ 6 | ≤ 6 |
| Maior arquivo em `src/` | 1740 linhas | 1740 | 1740 | ≤ 500 |

Prazos: Fase 1 em 2 dias úteis, Fase 2 em 2, Fase 3 em 5, Fase 4 em 10 (só com OK explícito). Total de 19 dias úteis em sequência, cerca de 14 com Fases 2 e 3 em paralelo. Detalhes em `docs/dev/PLANO-ADEQUACAO-BUILDOPS.md`.

SLA de disponibilidade e de atendimento do produto: A CONFIRMAR (Rael).

## Riscos conhecidos
- `main` vermelha: 5 de 93 testes falhando (`cb01-pending-user-tenant-block`) e 8 erros de `tsc`. A correção toca auth e passa pelo Rael.
- CI não roda em PR e não há branch protection. O gate não bloqueia nada antes do merge (ADR-UPX-005).
- Sem E2E. Cobertura baixa (4,33% das linhas em lib/services/hooks).
- Preview Vercel compartilha o backend de produção, segundo a configuração do repo.
- Migrations: 6 tabelas em produção sem arquivo de migration, `supabase/migrations-pending/20260821_add_lead_slug.sql` nunca aplicada, migrations fora do CI (`docs/history/AUDITORIA-CAMADAS.md`).
- 3 `.sql` na raiz catalogados como "NÃO aplicar" e pastas soltas (`tmp/`, `audit/`, `CRM SALES/`, `Copywriter/`, `Prompts/`, `Revisão - Julho/`). Possível credencial, revisão do Sentinela.
- Débito arquitetural: `AppContext.tsx` com 1184 linhas e `InboxPage.tsx` com 1740. Chamadas Supabase diretas em 3 páginas (ADR-UPX-004).
- Sem rate limiting próprio nem error tracking centralizado (`docs/history/AUDITORIA-CAMADAS.md`, camadas 9 e 12).
- Documentação desatualizada: `CLAUDE.md` (saúde técnica), `TODO.md`, `BUGS.md`, e `docs/CLOUDFLARE_PAGES.md` descreve hospedagem que não é a atual.

## Links
- Plano de adequação: `docs/dev/PLANO-ADEQUACAO-BUILDOPS.md`
- Decisões: `docs/decisions/README.md`
- Contexto do projeto: `CLAUDE.md`, `README.md`, `docs/dev/TENANT_PLAN.md`
- Camadas: `docs/history/totum-state.md`, `docs/history/AUDITORIA-CAMADAS.md`
- Segurança: `docs/dev/SEGURANCA-MCP-SUPABASE.md`, `docs/history/AUDITORIA-API-KEYS.md`
- Contribuição e rollback: `docs/CONTRIBUTING.md`, `docs/ROLLBACK.md`
- Backlog: `TODO.md`, `BUGS.md`
- Painel Vercel: A CONFIRMAR (Rael)
- Supabase de produção: self-hosted em `upixel.grupototum.com` (VPS Nova). O projeto Cloud `xusdhzwfkzufupjwbebt` é legado
- Board de tasks (Linear, GitHub Issues ou Markdown): A CONFIRMAR (Rael)
