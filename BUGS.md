# BUGS.md, uPixel CRM

**Reconciliado em 2026-11-07** (contra o código em disco, branch main @ 9d9f572)
**Base original:** Auditoria Caixa-Cinza (estática) e Caixa-Preta (runtime), ambas de 2026-05-11
**Método da reconciliação:** leitura do código atual (grep/read nos arquivos citados). Itens que dependem de dados de produção ou de navegador estão marcados como NÃO VERIFICADO.
**IDs preservados:** BUG-001..034 (Parte 1) e R-001..R-032 (Parte 2). Numeração de linha refere-se ao código atual.

## Resumo

| Status | Parte 1 (BUG-xxx, 34) | Parte 2 (R-xxx, 32) | Total (66) |
|---|---|---|---|
| RESOLVIDO | 24 | 19 | 43 |
| OBSOLETO | 1 | 0 | 1 |
| PARCIAL | 4 | 3 | 7 |
| ABERTO | 5 | 3 | 8 |
| NÃO VERIFICADO | 0 | 7 | 7 |

Itens adicionais de segurança (SEC-x, vindos de ISSUE-*.md, AUDITORIA-API-KEYS.md e PROGRESSO-UPIXEL.md) estão na seção própria abaixo e não entram na contagem acima.

Legenda de severidade original: 🔴 crítico, 🟡 médio, 🟢 leve.

---

## EM ABERTO (ordem de severidade)

### Segurança e isolamento de tenant (fora dos 66 IDs originais)

| ID | Status | Situação atual | Evidência |
|---|---|---|---|
| SEC-1 (A-01) | ABERTO 🔴 | `send-push` valida o chamador com `auth.getUser()`, mas `whatsapp-webhook` e `instagram-webhook` chamam com a service role key. Push de mensagem nova provavelmente nunca é enviado, sem log. | `supabase/functions/send-push/index.ts:75-92`; `ISSUE-send-push-bearer.md` |
| SEC-2 (A-02) | ABERTO 🔴 | `whatsapp-status-probe` usa service role e consulta `integrations` por `integration_id` sem checar se o chamador pertence ao tenant. Qualquer JWT válido de qualquer tenant que conheça o UUID lê status. | `supabase/functions/whatsapp-status-probe/index.ts:19-48`; `ISSUE-whatsapp-status-probe-auth.md` |
| SEC-3 (PC-028) | ABERTO 🟡 | CORS cai em `*` quando `ALLOWED_ORIGINS` não está setada. Se a variável está setada em produção: NÃO VERIFICADO (painel Supabase). | `supabase/functions/_shared/cors.ts:2` |
| SEC-4 (PC-037) | NÃO VERIFICADO | Fallback que varre todas as integrações pelo `webhook_verify_token` ainda existe no código. Depende de confirmar se todo tenant tem `integration_id` na URL cadastrada na Meta. | `supabase/functions/facebook-messenger-webhook/index.ts:30-46` |
| SEC-5 (PC-038 d/e) | PARCIAL | Migration de RLS tenant-scoped e bucket privado existe no repositório. Se foi aplicada em produção: NÃO VERIFICADO. Backfill de mídia (b) depende de dry-run manual. | `supabase/migrations/20260810150000_pc038_storage_policies.sql` |
| SEC-6 (PC-039) | NÃO VERIFICADO | Roles divergentes entre fontes e `profiles.role` sem CHECK. Exige `SELECT DISTINCT role FROM profiles` em produção. | `PROGRESSO-UPIXEL.md` (tabela de bloqueados) |
| SEC-7 (PC-040) | PARCIAL | Reconciliação das migrations órfãs feita em documento, mas o CI só tem `apply-sdr-migration.yml` (migration fixa), sem aplicação geral de migrations. | `.github/workflows/`, `PC-040-RECONCILIACAO.md` |
| SEC-8 | NÃO VERIFICADO | Série de correções `fix/cb-01..cb-10` está no histórico (cb-01, 02, 03, 04, 05, 06, 08, 09, 10). Não há commit nem referência a `cb-07` no repositório: confirmar se o item foi descartado ou se falta. | `git log` (1c43f8d, 40ae9b2, 1a8f268, 1ee18e6, 5ed1605, 0c84224, dee81b0, 9842ce3, ff0fa6c) |

### 🔴 Críticos e parciais da auditoria

#### BUG-024 (PARCIAL): Exclusão de lead sem confirmação no detalhe do lead
- **Origem:** marcado como resolvido em 2026-06, mas o código novo reabriu a lacuna.
- **O que está coberto:** `ContactsPage.tsx:194-199` (AlertDialog), `BulkActionsBar.tsx` (AlertDialog), `InboxPage.tsx:1562` (AlertDialog).
- **O que falta:** `LeadDetailActions.handleDelete` chama `deleteLead` direto no clique de "Excluir", sem AlertDialog, e é usado na rota `/leads/:id` e no Dialog do CRM. Operação destrutiva sem confirmação.
- **Evidência:** `src/components/crm/LeadDetail.tsx:1060-1064` e `:1084`.
- **Fix:** envolver o botão em AlertDialog (padrão já usado em ContactsPage).

#### BUG-002 (PARCIAL): SecurityPage
- **Hoje:** troca de senha é real (`supabase.auth.updateUser` + `signOut({scope:"others"})`, `src/components/settings/SecuritySettings.tsx:51-54`). 2FA (switches `disabled`, linhas 104 e 117) e "Dispositivos Conectados" (linha 201) estão marcados "Em breve" e sem dados fake.
- **Falta:** implementar 2FA (MFA do Supabase Auth) e listagem de sessões. Área sensível (auth): aguardar aprovação humana.

#### BUG-005 (PARCIAL): Criação de automações
- **Hoje:** abas "rules" e "time_actions" abrem modal que pede nome e criam via `addBasicAutomation` (`src/pages/AutomationsPage.tsx:36-70`). O write fantasma "Nova Automação N" (R-017) foi eliminado.
- **Falta:** as demais abas mostram `toast.info("... ainda não está disponível por aqui")` (linha 45). Sem fake de sucesso, mas sem criação.

#### BUG-006 (PARCIAL): "Testar Fluxo"
- **Hoje:** o botão tem handler, mas só mostra toast com instrução (`src/pages/AutomationBuilderPage.tsx:69`).
- **Falta:** dry-run real do fluxo.

#### R-001 (PARCIAL): Carga total de leads no client
- **Resolvido:** a tela Dashboard usa o RPC `useDashboardKpis` (`src/pages/DashboardPage.tsx:27`, migration `20260511_dashboard_kpis_rpc.sql`).
- **Falta:** `AppContext.fetchAll` ainda baixa todos os leads em páginas de 1000 em background na entrada do app (`src/contexts/AppContext.tsx:150-262`, fase 3), para qualquer rota.

#### R-023 (PARCIAL): Possível vazamento cross-tenant em /users
- **Hoje:** rota exige `users.view` (`src/App.tsx:196`); `UsersPage.tsx:122-125,170-173` filtra por `tenant_id` para não-master; migrations de RLS de isolamento existem (`20260902000100_rls_hotfix_tenant_isolation.sql`, `20261028120000_fix_cb01_pending_user_tenant_block.sql`).
- **Falta:** confirmar em `pg_policies` de produção que `profiles` não é legível entre tenants por não-master. NÃO VERIFICADO (não dá para verificar por código).

#### R-030 (PARCIAL): CTAs da landing
- **Resolvido na landing PT:** CTAs chamam `requestDemo()` e levam a `/cadastro` (`src/pages/LandingPage.tsx:12-18,73,95,212`).
- **Falta:** `LandingPageEN.tsx` aponta CTAs para `https://upixel.app` (linhas 200, 212, 432), ou seja, para a própria landing.

### 🟡 Médios

#### R-004 (ABERTO): `tasks` carregadas com `limit(5000)`
- **Evidência:** `src/services/leads.ts:426` (`listTasks`), chamado em `AppContext.tsx:~172`.

#### BUG-008 (ABERTO): Aba "Histórico" de Disparos é placeholder
- **Evidência:** `src/pages/WhatsAppBroadcastPage.tsx:83-95` ("Relatórios Detalhados ... serão exibidos aqui").
- **Fix:** query em `broadcast_jobs` ou badge Coming Soon.

#### BUG-017 (ABERTO): "Salvar contato" do Inbox só toast
- **Evidência:** `src/pages/InboxPage.tsx:926` (`toast.info("Função de salvar contato em breve")`).

#### BUG-020 (ABERTO): Rate Card "Brasil" hardcoded
- **Evidência:** `src/pages/WhatsAppBroadcastPage.tsx:59`.

#### BUG-018 (ABERTO): Botões "QR Code" / "API Oficial" sem `aria-pressed`
- **Evidência:** o código mudou de arquivo: agora em `src/components/whatsapp/WhatsAppManagement.tsx:735-738` (sem `aria-pressed`).

#### R-027 (ABERTO, baixo): Aba "Avançado" de Reports marcada Coming Soon
- **Evidência:** `src/pages/ReportsPage.tsx:531-544` (`ComingSoonCard`). É por design documentado.

### 🟢 Leves

#### R-009 (ABERTO): Botões do Inbox sem `aria-label`
- **Evidência:** poucos `aria-label` no módulo (`InboxPage.tsx`: 8; `components/inbox/*`: 1 em ConversationActions, MacrosDropdown, ReplyBox, SnoozePopover; 0 nos demais).

#### BUG-032 (ABERTO): "Automações avançadas em breve" misturado a feature ativa
- **Evidência:** `src/components/crm/LeadDetail.tsx:970-973` (código migrou de `LeadProfilePage.tsx`).

### NÃO VERIFICADO (dependem de runtime ou de dados de produção)

| ID | Item | Por que não foi verificado |
|---|---|---|
| R-002 | Chamadas duplicadas no Dashboard | Só observável em rede no navegador. O Dashboard agora usa RPC, então o padrão original provavelmente não existe mais. |
| R-003 | `profiles` puxado 3x na carga | Só observável em rede no navegador. |
| R-010 | Contador "1 número conectado" vs 2 cards | `WhatsAppPage.tsx` agora tem 15 linhas e delega a componentes; lógica não auditada a fundo. |
| R-020 | Cards "Boas-vindas" e "Parabéns" com GATILHO/AÇÕES vazios | Depende dos dados das automações do tenant. |
| R-021 | Várias "Nova Automação N" no banco | Dado de produção. A causa (R-017) foi corrigida; a limpeza dos registros é manual. |
| R-024 | "Demo uPixel" duplicado em Users | Dado de produção. |
| R-026 | Funil de Reports com 0 leads | `ReportsPage.tsx:44` lê `leads` do AppContext (dados reais); o resultado em produção não foi testado. |

---

## HISTÓRICO (RESOLVIDO e OBSOLETO, com evidência)

### Parte 1: auditoria estática

| ID | Status | Evidência |
|---|---|---|
| BUG-001 | RESOLVIDO | Senha removida do client. Gate validado server-side pela edge function `check-signup-gate` (lê do Vault, comparação em tempo constante): `supabase/functions/check-signup-gate/index.ts`, `src/services/signup.ts:49`. Commit 0c84224 (fix cb-06) e migration `20261030120000_fix_cb06_signup_gate_server_side.sql`. `grep Master123` em `src` e `supabase` vazio. |
| BUG-003 | RESOLVIDO | Botão e "Zona de Perigo" não existem mais (`grep "Excluir Conta"` em `src` vazio). `ProfilePage.tsx` agora só renderiza `ProfileSettings`. Exclusão real de conta continua não implementada (decisão de produto, área sensível). |
| BUG-004 | RESOLVIDO | Form controlado com `handleUpdatePassword` e `supabase.auth.updateUser`: `src/components/settings/SecuritySettings.tsx:51,141`. |
| BUG-007 | RESOLVIDO | Os dois botões mortos foram removidos da página (`WhatsAppBroadcastPage.tsx` tem 100 linhas e nenhum "Central de Ajuda" ou "Configurar Webhook"). |
| BUG-009 | RESOLVIDO | `handleToggle` atualiza as integrações no banco para os 6 cards mapeados: `src/pages/IntegrationsPage.tsx:140-152`. Só o card sem mapeamento ainda mostra toast informativo. |
| BUG-010 | RESOLVIDO | `if (!id) { navigate("/automations?tab=bots"); return; }`: `src/pages/BotBuilderPage.tsx:187`. |
| BUG-011 | RESOLVIDO | AlertDialog "Excluir contato?": `src/pages/ContactsPage.tsx:194-199`. (A mesma classe de problema reapareceu em BUG-024, ver acima.) |
| BUG-012 | RESOLVIDO | `useEffect` com `navigate`: `src/pages/LoginPage.tsx:48-49`. |
| BUG-013 | RESOLVIDO | `catch (e)` com `logger.error`: `src/pages/SignupPage.tsx:61-62,178`. |
| BUG-014 | RESOLVIDO | Nenhum `setTimeout` de loading em `CRMPage.tsx` e `ContactsPage.tsx`; usam `loading` do AppContext (`ContactsPage.tsx:24`). |
| BUG-015 | RESOLVIDO | Empty state "Sem tarefas pendentes.": `src/pages/DashboardPage.tsx:248`. |
| BUG-016 | RESOLVIDO | `formatShortDate(task.due_date)`: `DashboardPage.tsx:273`, `src/lib/format-date.ts:26`. |
| BUG-019 | RESOLVIDO | Badge "API Meta Status: Operacional" removido da página (`WhatsAppBroadcastPage.tsx`, sem ocorrência). |
| BUG-021 | RESOLVIDO | Botão da câmera `disabled` com rótulo "em breve": `src/components/settings/ProfileSettings.tsx:52-58`. Troca real de foto segue não implementada. |
| BUG-022 | RESOLVIDO | Atalhos "Notificações" e "Idioma e Região" removidos (`ProfileSettings.tsx` sem ocorrência). |
| BUG-023 | RESOLVIDO | `projectId` e `setProjectId` não existem mais em `IntegrationsPage.tsx`. |
| BUG-025 | RESOLVIDO | `min={new Date().toISOString().split("T")[0]}`: `src/components/crm/LeadDetail.tsx:990`. |
| BUG-026 | RESOLVIDO | `aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}`: `LoginPage.tsx:226`. |
| BUG-027 | RESOLVIDO | `"integrações ativas" : "integração ativa"`: `IntegrationsPage.tsx:214`. |
| BUG-028 | RESOLVIDO | `ChevronRight` vem de `lucide-react`: `ContactsPage.tsx:5`; sem redefinição local. |
| BUG-029 | OBSOLETO | `src/pages/Index.tsx` não existe mais. |
| BUG-030 | RESOLVIDO | `BuilderInner` e `void handleSave` não existem em `BotBuilderPage.tsx` (228 linhas). |
| BUG-031 | RESOLVIDO | Título agora "Aumente seu ROI com Envios Oficiais" sem emoji: `WhatsAppBroadcastPage.tsx:28`. |
| BUG-033 | RESOLVIDO | Sem traço decorativo nos KPIs do Dashboard; valores usam `stats?.x ?? 0`: `DashboardPage.tsx:39-54`. |
| BUG-034 | RESOLVIDO | `if (rawDiff < 0) return "Agendado"`: `src/lib/format-date.ts:10`. |

### Parte 2: auditoria runtime

| ID | Status | Evidência |
|---|---|---|
| R-005 | RESOLVIDO | `/dashboard` redireciona para `/`: `src/App.tsx:166`. |
| R-006 | RESOLVIDO | 404 em PT-BR: `src/pages/errors/NotFoundPage.tsx:8` ("Página não encontrada") e `NotFound.tsx:16`; rota `*` em `App.tsx:223`. |
| R-007 | RESOLVIDO | Botão "Em breve" do toolbar removido. O botão de emojis ficou `disabled` com aria-label: `src/components/inbox/ReplyBox.tsx:427`. |
| R-008 | RESOLVIDO | "USAR IA" agora dá feedback (`toast.info("IA analisando histórico...")`): `ReplyBox.tsx:481`. |
| R-011 | RESOLVIDO | KPIs de Disparos mostram um traço e "Em breve" em vez de números inventados: `src/components/whatsapp/broadcast/BroadcastDashboard.tsx:9-14,46-52`. |
| R-012 | RESOLVIDO | Histórico vira empty state "Nenhum disparo realizado": `BroadcastDashboard.tsx:62-80`. |
| R-013 | RESOLVIDO | Badge "SOON" e botão de ajuda não existem mais (sem ocorrência em `src/pages/WhatsAppBroadcastPage.tsx` e `src/components/whatsapp/broadcast`). |
| R-014 | RESOLVIDO | Seção "STATUS DE IMPLEMENTAÇÃO (ADMIN)" não existe mais (sem ocorrência). |
| R-015 | RESOLVIDO | Mesma evidência de BUG-019. |
| R-016 | RESOLVIDO | Na primeira carga, o AppContext troca para o funil com mais leads quando o padrão está vazio: `src/contexts/AppContext.tsx:~214-228`. |
| R-017 | RESOLVIDO | "Nova Automação" abre modal que exige nome antes de gravar: `src/pages/AutomationsPage.tsx:43-70`. |
| R-018 | RESOLVIDO | Pluralização correta (ver BUG-027). |
| R-019 | RESOLVIDO | Aba "Bots" ativa com `BotsTab`, sem rótulo "Em breve": `AutomationsPage.tsx:115,128`. |
| R-022 | RESOLVIDO | Os itens foram removidos (ver BUG-022). |
| R-025 | RESOLVIDO | Variações inventadas ("+3.2%", "+12%", "-2.1%") não existem mais em `ReportsPage.tsx`; o texto do KPI é derivado (`:308`). |
| R-028 | RESOLVIDO | `/signup` redireciona para `/cadastro`: `src/App.tsx:130-134`. |
| R-029 | RESOLVIDO | `/login` no domínio raiz renderiza `WorkspaceLoginPage`: `src/App.tsx:138`. |
| R-031 | RESOLVIDO | Texto "Substituir por print do sistema" não existe mais em `src` (grep vazio). |
| R-032 | RESOLVIDO | Copy "Seu período de teste acabou" removido (grep vazio na landing). |

---

## Notas

- Aviso operacional herdado: a automação "Nova Automação 91" criada na auditoria runtime no tenant Totum deve ser apagada manualmente (ver R-021).
- Lint atual: 0 erros e 509 warnings (500 `no-explicit-any`, 8 `exhaustive-deps`). Referência na CLAUDE.md ainda diz 428.
- Esta reconciliação não executou o app em navegador nem consultou o banco de produção.

*BUGS.md reconciliado em 2026-11-07. Não substitui QA manual.*
