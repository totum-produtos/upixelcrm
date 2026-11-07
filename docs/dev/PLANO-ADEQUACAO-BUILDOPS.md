# Plano de Adequação BuildOps: uPixel CRM

**Data:** 2026-11-07
**Classificação:** POP-014-B Adequar, tag `[adequar]`
**Agentes:** Tech Lead (Claude) + Kleber (revisão), Testador (Sonnet) + Kimi Claw nas fases de teste
**Status:** aguardando aprovação do Rael
**Base auditada:** `main` @ `c3fa1d6` (2026-11-07)

---

## 1. Diagnóstico (o que foi medido, não o que o CLAUDE.md diz)

| Verificação | CLAUDE.md diz | Medido hoje | Situação |
|---|---|---|---|
| Build | OK | OK | ✅ |
| Lint | 428 warnings, 0 erros | **509 warnings**, 0 erros | ⚠️ piorou 19% |
| TypeScript strict | OK | **8 erros** em `tsc --noEmit` | 🔴 CLAUDE.md desatualizado |
| Testes unitários | não medido | **5 falhando** de 93 (`cb01-pending-user-tenant-block`) | 🔴 main está vermelha |
| Cobertura | sem meta | **não medida** (vitest sem `coverage`) | 🔴 Gate de 80% impossível de aferir |
| E2E | Playwright instalado | **0 testes**, config é template do Lovable | 🔴 fluxos críticos sem E2E |
| CI | "gate de qualidade" | roda **só no push para `main`**, nunca em PR | 🔴 gate não bloqueia nada antes do merge |
| Docs bilíngues | não existe | sem `/docs/dev`, `/docs/user`, `/docs/decisions` | 🔴 |
| ADRs | não existe | decisões espalhadas em 29 `.md` na raiz | 🔴 |
| PROJECT_CARD.md | não existe | não existe | 🔴 |
| Graphify | não aplicado | `graphify.json` ausente | 🟡 |
| Deploy | "Vercel (implied)" | Vercel confirmado (`vercel.json` + deploy.yml); edge functions via Actions | ✅ só documentar |
| Canary / blue-green | não existe | Vercel faz preview por PR, sem canário de tráfego | 🟡 aceitável para o porte |
| Backlog técnico | TODO.md (2026-05-10) | AppContext 914 → **1184 linhas**, InboxPage 1365 → **1740 linhas** | 🔴 TODO desatualizado e débito cresceu |
| `any` explícito | "principalmente any" | 124 ocorrências | 🟡 |

### Fatos relevantes
- Os 5 testes falhando são por um refactor em `src/lib/auth-access.ts` que removeu `getAccessState` sem atualizar o teste. Isso é área sensível (auth), então **a correção passa pelo Rael antes** (matriz de escalação, linha "Fix precisa mexer RLS/Auth").
- A CI só roda no push para `main`. Na prática, o que a Vercel mostra verde no PR é só o build de preview. Hoje o PR #120 subiu e mergeou sem lint, teste ou tsc rodar.
- Há 29 arquivos `.md` soltos na raiz, 3 arquivos `.sql` catalogados como "NÃO aplicar", pastas `tmp/`, `audit/`, `CRM SALES/`, `Copywriter/`, `Prompts/`, `Revisão - Julho/`. Isso polui o contexto de qualquer agente e é o primeiro alvo de faxina.
- `migrations-pending/` tem 1 migration que nunca foi aplicada. Precisa de decisão explícita (aplicar ou arquivar).

### Hipóteses (não confirmadas)
- O skill `totum-buildops-orchestrator` cita `docs/principios-buildops.md`, `docs/decisoes-arquiteturais.md` e os POP-014 A-E como arquivos a carregar, mas **eles não existem** no `totum-house/skills` clonado hoje. Ou estão em outro repo, ou ainda não foram escritos. Até confirmar, os ADRs deste plano usam numeração local (`ADR-UPX-001`...).
- Linear via Composio não está disponível nesta sessão. As tasks abaixo ficam em Markdown até você dizer onde mora o board.

---

## 2. ADRs aplicáveis (a registrar em `/docs/decisions/`)

| ID | Decisão | Já vale hoje? |
|---|---|---|
| ADR-UPX-001 | Stack canônica: React 18 + Vite + TS strict + Supabase + Vercel. Edge functions deployadas por Actions. | Sim, só formalizar |
| ADR-UPX-002 | Multi-tenant por subdomínio com RLS por `tenant_id`. Toda mudança em RLS/Auth/Storage exige aprovação do Rael. | Sim (CLAUDE.md No-Fly Zones) |
| ADR-UPX-003 | Credenciais nunca no repo nem no bundle. Vault é do Sentinela. | Sim (D-007 Totum) |
| ADR-UPX-004 | Camadas: `services/` (repositório por domínio) → `hooks/` → `pages/`. Pages não chamam Supabase direto. | Parcial (Lotes 1-2 do `docs/history/totum-state.md`) |
| ADR-UPX-005 | Quality Gate obrigatório em PR: lint 0 erros, tsc 0 erros, testes 100% verdes, cobertura ≥ meta da fase. | **Não**, é o que este plano instala |
| ADR-UPX-006 | Preview Vercel por PR = ambiente canário. Smoke E2E roda contra o preview antes do merge. | Não |

---

## 3. Plano faseado (POP-014-B)

Regra do `docs/history/totum-state.md` continua valendo: **1 movimento = 1 commit = 1 PR pequeno**, build + lint + teste após cada um, quebrou reverte.

### Fase 1: Estancar a sangria (SLA: 2 dias úteis)
Objetivo: `main` verde e gate funcionando em PR. Nada de refactor aqui.

| # | Movimento | Área sensível? | Agente |
|---|---|---|---|
| 1.1 | CI roda em `pull_request` para `main` (lint + tsc + test + build), e `deploy-functions` continua só no push | Não (`.github/` era intocável no plano de camadas, aqui precisa de OK explícito) | Tech Lead |
| 1.2 | Adicionar `tsc --noEmit` ao script `lint` ou como step próprio; corrigir os 8 erros (7 são tipagem de Dashboard/Preferences, 1 é o teste) | Não | Tech Lead |
| 1.3 | Corrigir `cb01-pending-user-tenant-block` alinhando teste ao `auth-access.ts` atual, **sem mudar comportamento de auth** | **Sim, auth. Rael aprova o diff** | Tech Lead + Rael |
| 1.4 | Ativar `coverage` no vitest (v8) com relatório no CI, **sem threshold ainda**, só pra medir | Não | Testador |
| 1.5 | Branch protection em `main`: PR obrigatório + check `ci` obrigatório | Config do GitHub, Rael faz | Rael |

**Gate de saída:** CI verde em PR, 0 erros tsc, 93/93 testes, número de cobertura conhecido.

### Fase 2: Faxina e contexto (SLA: 2 dias úteis)
Objetivo: repo legível por agente e por humano.

| # | Movimento | Agente |
|---|---|---|
| 2.1 | Criar `PROJECT_CARD.md` (objetivo, stack, ambientes, donos, SLAs, links reais de Vercel/Supabase que hoje estão "preencher") | Tech Lead + Rael |
| 2.2 | Mover os 29 `.md` da raiz: decisões → `/docs/decisions/`, auditorias e relatórios → `/docs/history/`, specs vivas → `/docs/dev/`. Manter na raiz só `README`, `CLAUDE.md`, `CHANGELOG`, `TODO`, `BUGS` | Writer (Gemini/Kimi) + revisão Tech Lead |
| 2.3 | Decidir destino dos 3 `.sql` da raiz, da `migrations-pending/` e das pastas `tmp/`, `audit/`, `CRM SALES/`, `Copywriter/`, `Prompts/`, `Revisão - Julho/` (arquivar fora do repo ou `/docs/internal/`) | **Rael decide**, agente executa |
| 2.4 | Atualizar `CLAUDE.md`: tabela de saúde com números reais, deploy Vercel confirmado, skills apontando pro plugin `totum-skills` em vez de `VIBE CODING TOTUM SYSTEM/` | Tech Lead |
| 2.5 | Escrever ADR-UPX-001 a 006 com template (contexto, decisão, consequências, hash do commit) | Writer |
| 2.6 | Rodar `graphify update .` e commitar `graphify.json` | Tech Lead |
| 2.7 | Reconciliar `TODO.md` e `BUGS.md` com o estado real (quais dos 34 bugs já foram fechados nos PRs cb-01..cb-10) | Testador |

**Gate de saída:** raiz com ≤ 6 arquivos `.md`, ADRs escritos, PROJECT_CARD aprovado, CLAUDE.md sem número furado.

### Fase 3: Testes como gate real (SLA: 5 dias úteis)
Objetivo: chegar nos thresholds do pipeline BuildOps de forma incremental, sem travar o time.

| # | Movimento | Meta | Agente |
|---|---|---|---|
| 3.1 | Threshold de cobertura no vitest = número medido na Fase 1 (não pode cair) | ratchet | Testador |
| 3.2 | Testes unitários nos `services/` já criados (leads, users, integrations, inbox, broadcast, automations) | +cobertura nos repositórios | Testador (Sonnet) |
| 3.3 | Playwright real: substituir config Lovable, criar `e2e/` com 5 fluxos críticos (login, signup+tenant, criar lead, mover no pipeline, enviar mensagem inbox) rodando contra o preview da Vercel | 100% fluxos críticos | Kimi Claw |
| 3.4 | Threshold em ratchet nos módulos sensíveis (`lib/`, `services/`, `hooks/`): só pode subir, nunca cair. Sem meta de 80% global (Forja v1.1) | não cai | Testador |
| 3.5 | Semgrep com regras de padrões de IA (secrets, `any` em boundary, fetch sem tratamento de erro) como step de `static_analysis` | 0 críticos | Tech Lead |

**Gate de saída:** pipeline BuildOps com `lint_format`, `static_analysis`, `unit_tests`, `integration_tests` (E2E no preview) e `human_approval` funcionando.

### Fase 4: Débito arquitetural (SLA: 10 dias úteis, só com OK explícito)
É a continuação do Lote 3/4 do `docs/history/totum-state.md`. Entra só depois da Fase 3, porque sem teste não dá pra refatorar com segurança.

| # | Movimento | Risco |
|---|---|---|
| 4.1 | `AppContext.tsx` (1184 linhas) → `CRMContext`, `TaskContext`, `AutomationContext`, `UIContext` | Alto, re-render global |
| 4.2 | `InboxPage.tsx` (1740 linhas) → `useChatLogic`, `useWhatsAppAPI`, `useRealtimeMessages` | Alto, realtime é integração crítica |
| 4.3 | `UsersPage`, `ImportPage`, `LeadProfilePage` (SRP) | Médio |
| 4.4 | `ErrorBoundary` no root + tratamento de rede nos hooks | Baixo |
| 4.5 | Corrigir os `exhaustive-deps` (parte dos 509 warnings), priorizando inbox e automations | Médio, stale closures |
| 4.6 | `LandingPage` + `LandingPageEN` → um componente com `lang` | Baixo |

**Gate de saída:** 0 warnings de `exhaustive-deps` nos módulos críticos, nenhum arquivo em `src/` acima de 500 linhas, cobertura mantida.

### Fase 5: Manutenção contínua (POP-014-E, handoff para Pepper)
- Auto-loop semanal: `npm run lint`, `tsc`, `vitest --coverage`, Playwright no preview. Resultado vira issue se regrediu.
- Changelog automático por PR (Kimi Claw), `CHANGELOG.md` deixa de ser manual.
- Revisão mensal de `TODO.md`/`BUGS.md` pelo Kleber.
- `graphify update` em todo PR que cria arquivo em `src/`.

---

## 4. SLA e KPIs

| Indicador | Hoje | Fase 1 | Fase 3 | Fase 4 |
|---|---|---|---|---|
| Erros tsc | 8 | 0 | 0 | 0 |
| Testes falhando | 5 | 0 | 0 | 0 |
| Cobertura (lib/services/hooks) | 4,33% | medida ✅ | não cai (ratchet) | não cai (ratchet) |
| E2E fluxos críticos | 0 | 0 | 5 | 5 |
| Warnings lint | 509 | ≤ 509 (ratchet) | ≤ 400 | ≤ 150 |
| CI em PR | não | sim, < 5 min | < 15 min com E2E | < 15 min |
| `.md` na raiz | 29 | 29 | ≤ 6 | ≤ 6 |
| Maior arquivo em `src/` | 1740 linhas | 1740 | 1740 | ≤ 500 |

Tempo total estimado: **19 dias úteis** em sequência. Fases 2 e 3 podem rodar em paralelo (agentes diferentes), o que cai para ~14.

---

## 5. Escalação prevista

| Gatilho | Para quem |
|---|---|
| 1.3 toca `auth-access.ts` | Rael aprova o diff antes do push |
| 2.3 decide arquivar `.sql` e `migrations-pending/` | Rael + Sentinela (pode ter credencial em `.sql`) |
| 4.1 e 4.2 custam > 5 dias | Pepper avalia dividir |
| Qualquer movimento descobrir débito fora deste escopo | Parar e reabrir escopo com Rael |

---

## 6. O que preciso do Rael antes de começar

1. **OK para a Fase 1** (é a única urgente: `main` está vermelha e o gate não bloqueia nada).
2. **Posso mexer em `.github/workflows/deploy.yml`?** O plano de camadas de julho marcou `.github/` como intocável. A Fase 1 precisa abrir uma exceção só pro job `ci`.
3. **Onde ficam os POP-014 A-E e os ADRs D-XXX?** Não estão no `totum-house/skills`. Se existirem em outro lugar, eu alinho a numeração.
4. **Board de tasks:** Linear via Composio, GitHub Issues ou Markdown?

---

## Revisão pela Forja v1.1 (2026-11-07)

**Classificação:** POP-014-B Adequar, tamanho **G** (tocou auth/tenant em edge functions, infra de CI e estimativa acima de 5 dias). G nunca é rebaixado.

O que muda neste plano:
- Sai a meta de 80% de cobertura global e o canário de tráfego (a v1.1 manda não exigir). Fica o ratchet nos módulos sensíveis.
- Gate de G em todo PR: build, lint, typecheck, secret scan, Semgrep (só achados novos bloqueiam), auditoria de dependências, Lighthouse em entrega web, rollback declarado, revisão humana.
- Débito fora do escopo: anotar e avisar, não corrigir junto. Na noite de 2026-11-07 isso foi descumprido em três pontos (bug do Kanban no #128, fix do Dashboard dentro do #122, conserto do deploy de functions no #124); estão registrados em `docs/dev/HANDOFF-BUILDOPS-2026-11-07.md`.
- Baseline retroativo em `docs/dev/BASELINE-FORJA.md`.
- Isolamento por tenant: ADR-UPX-007 (RLS como fronteira, filtro explícito só em operações em massa e destrutivas).
