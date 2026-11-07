# TODO.md, uPixel CRM

**Reconciliado em 2026-11-07** (contra o código em disco, branch main @ 9d9f572)
**Base original:** Revisão Pré-Produção de 2026-05-10 (6 categorias CAT-1..CAT-7)
**Sistema:** Vibe Coding Totum v3.0
**Ver também:** BUGS.md (itens de segurança e tenant em aberto estão lá, seção SEC-x)

## Resumo

| Status | Itens |
|---|---|
| RESOLVIDO | 4 |
| OBSOLETO | 2 |
| PARCIAL | 4 |
| ABERTO | 9 |
| NÃO VERIFICADO | 0 |
| **Total (19 itens originais)** | **19** |

Itens novos descobertos na reconciliação (fora da contagem): 3, marcados com [NOVO].

Medições em 2026-11-07: lint com 0 erros e 509 warnings (500 `no-explicit-any`, 8 `exhaustive-deps`); 104 chamadas `useEffect(` em `src`.

---

## 🔴 CRÍTICO

- [ ] **[CAT-3 PERF]** Quebrar `AppContext.tsx` em contextos por domínio (ABERTO)
  - Hoje: 1184 linhas (eram 914). Cresceu, apesar de o acesso a dados ter migrado para `src/services/*` (ver item PARCIAL de CAT-5 abaixo).
  - Continua um contexto único: qualquer mudança de lead, tarefa ou automação re-renderiza todos os consumidores.
  - Proposta mantida: `CRMContext`, `TaskContext`, `AutomationContext`, `UIContext`.
  - Arquivo: `src/contexts/AppContext.tsx`
  - Área sensível (tenant): confirmar plano antes de mexer.

- [ ] **[CAT-5 SRP]** Refatorar `InboxPage.tsx` (PARCIAL)
  - Já feito: lógica de dados extraída para `src/hooks/useInbox.ts` (1046 linhas), fatias I-1..I-5 (`docs/history/totum-state.md`: 9145f7d, aed70d9, d55bebe, 95f6605, 4109b5f).
  - Falta: a página cresceu para 1740 linhas (eram 1365). Extrair UI em componentes e hooks menores (`useWhatsAppAPI`, `useRealtimeMessages`).

---

## 🟡 ALTO

- [ ] **[CAT-5 SRP]** Dividir `AppContext.tsx` (God Context) (PARCIAL)
  - Já feito: A-1..A-4 moveram todas as queries para repositórios em `src/services/` (PR #38, `docs/history/totum-state.md`); o arquivo não importa mais o cliente Supabase.
  - Falta: continua concentrando CRUD de leads, pipelines, colunas, tarefas, timeline e automações. Depende do item crítico de CAT-3.

- [ ] **[CAT-6 TS]** Tipar `AppContext.tsx` (ABERTO)
  - Hoje: 16 ocorrências de `any` (eram 7). Exemplos: `src/contexts/AppContext.tsx:198` (`(c: any)`), `:217` (`(row as any)`), `:261` (`any[]`), `:550` (`"new_lead" as any`), `:1035-1045`.

- [ ] **[CAT-3 PERF]** Corrigir `useEffect` com deps incompletas (PARCIAL)
  - Hoje: 8 warnings `react-hooks/exhaustive-deps` (eram 22).
  - Rodar `npm run lint | grep exhaustive-deps` e tratar os 8 restantes.

- [ ] **[CAT-4 ERROS]** Tratamento de erro de rede em hooks (PARCIAL)
  - `useSequences.ts` e `useCannedResponses.ts` não têm `try/catch`, mas tratam `error` retornado pelo Supabase com `logger.error` e `toast.error` (ex.: `src/hooks/useSequences.ts:~55-60`).
  - Falta: tratar rejeição de rede/timeout (exceção) nas chamadas, com mensagem ao usuário.

- [ ] **[CAT-5 SRP]** Refatorar `UsersPage.tsx` (ABERTO)
  - Hoje: 850 linhas (eram 845). Separar listagem, formulário e lógica de permissões.
  - Área sensível (permissões): confirmar plano antes de mexer.

- [ ] **[CAT-5 SRP]** Refatorar `ImportPage.tsx` (ABERTO)
  - Hoje: 979 linhas (eram 762). Extrair `useCsvParser` e `useExcelParser`.

---

## 🟢 MÉDIO

- [ ] **[CAT-4 ERROS]** `ErrorBoundary` por módulo: inbox, leads, automations (ABERTO)
  - Existe só o boundary global (`src/App.tsx:236-242` e `src/main.tsx:51`). Nenhum uso por módulo.

- [ ] **[CAT-5 SRP]** Refatorar `DatabaseBackupPage.tsx` (ABERTO)
  - Hoje: 668 linhas (eram 687). Restore já restrito a formato estruturado (commit dee81b0).

- [ ] **[CAT-3 PERF]** Monitorar crescimento dos `useEffect` (ABERTO)
  - Hoje: 104 (eram 120), abaixo do limite de 150. Manter a convenção de lint se passar disso.

- [ ] **[NOVO][CAT-5 SRP]** Dividir `src/components/crm/LeadDetail.tsx` (1143 linhas)
  - O refactor 7fff699 moveu as ~1000 linhas de `LeadProfilePage` para cá. O problema de tamanho só mudou de lugar.
  - Extrair `useLeadTimeline`, `useLeadTasks`, `<LeadNotes />`, `<LeadTimeline />`.

- [ ] **[NOVO][CAT-5 SRP]** Arquivos acima de 600 linhas sem plano
  - `src/pages/CRMPage.tsx` (886), `src/components/whatsapp/WhatsAppManagement.tsx` (767), `src/components/whatsapp/broadcast/BroadcastConfigModal.tsx` (673).

- [ ] **[NOVO][CAT-4 ERROS]** Confirmação ao excluir lead no detalhe
  - Ver BUG-024 em BUGS.md: `src/components/crm/LeadDetail.tsx:1060-1084` exclui sem AlertDialog.

---

## ⚪ BAIXO

- [ ] **[CAT-6 TS]** Tipar gradualmente os `any` do projeto (ABERTO)
  - Hoje: 500 warnings `no-explicit-any` (eram ~404). Começar por integrações Google e automações; criar tipos Supabase corretos em vez de `as unknown as`.

- [ ] **[CAT-7 UI]** `LandingPageEN.tsx` com cores hardcoded (ABERTO)
  - `src/pages/LandingPageEN.tsx` (514 linhas) define o próprio CSS em string com cores `#hex` (linhas 3-15), sem usar variáveis do tema. Não foi unificada com `LandingPage.tsx`.

---

## HISTÓRICO (RESOLVIDO e OBSOLETO, com evidência)

| Item original | Status | Evidência |
|---|---|---|
| [CAT-2 DRY] Unificar `LandingPage.tsx` + `LandingPageEN.tsx` | OBSOLETO | A premissa (514 linhas duplicadas com só textos diferentes) não vale mais: `LandingPage.tsx` foi reescrita (232 linhas, usa componentes e tokens do app, commit 3e2570b) e `LandingPageEN.tsx` mantém 514 linhas com layout próprio. Rotas: `src/App.tsx:141-143`. A questão de estilo da EN ficou em CAT-7 acima. |
| [CAT-1 MORTO] `RagContextInjector.tsx` duplicado | OBSOLETO | Nenhum dos dois arquivos existe: `src/components/chat/` não existe e `src/components/alexandria/` só tem `AnalyticsPanel.tsx` e `RAGIntegrationStatus.tsx`. `find src -name 'RagContextInjector*'` vazio. |
| [CAT-4 ERROS] `ErrorBoundary` no root | RESOLVIDO | `src/components/ErrorBoundary.tsx`; usado em `src/App.tsx:11,236-242` e `src/main.tsx:5,51-53`. |
| [CAT-5 SRP] Refatorar `LeadProfilePage.tsx` (721 linhas) | RESOLVIDO | Agora tem 36 linhas, casca de layout em volta de `<LeadDetail>`. Commit 7fff699 ([refactor-lead-detail]). O tamanho foi para `LeadDetail.tsx` (ver item NOVO acima). |
| [CAT-1 MORTO] `.env.migration` e `.env.debug` | RESOLVIDO | Os arquivos não existem em disco; ambos estão no `.gitignore` (linhas 35 e 45) e `git ls-files` só rastreia `.env.example`. |
| [LINT] 2 `unused eslint-disable` em `scripts/` | RESOLVIDO | `npx eslint scripts` sem avisos; o lint completo não reporta `unused eslint-disable`. |

### Concluído na sessão original (2026-05-10)

- [x] CLAUDE.md atualizado para Vibe Coding Totum v3.0
- [x] KIMI.md atualizado para v2.0
- [x] BUGS.md criado com revisão pré-produção completa (6 categorias)
- [x] INDEX.md, CHECKLIST_PADRAO.md, BULMA_INDEX.md atualizados no sistema

---

## COMANDOS RÁPIDOS

```bash
npm run lint                                   # warnings atuais: 509
npm run lint | grep -c exhaustive-deps         # alvo: 0 (hoje 8)
npm run build                                  # build check
find src -name "*.tsx" -exec wc -l {} + | sort -rn | head -15   # arquivos grandes
```

*TODO.md reconciliado em 2026-11-07. Esta reconciliação não executou o app nem consultou o banco de produção.*
