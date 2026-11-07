# ADR-UPX-007: Isolamento de tenant: RLS como fronteira, filtro explícito só em operações em massa

**Status:** Proposta
**Data:** 2026-11-07

## Contexto
O isolamento entre tenants é garantido pela RLS do Supabase (ADR-UPX-002). Em `src/services/*`, as leituras já filtram por `client_id`, mas várias operações em massa ou destrutivas por lista de ids (`.in("id", ids)`, `.eq("lead_id", ...)`) dependiam só da RLS. Um erro de policy nessas operações afetaria muitas linhas de uma vez, e o dano é difícil de reverter (exclusão de leads, reapontamento de conversas e tarefas, remoção de colunas).

## Decisão
- A RLS continua sendo a fronteira oficial de tenant.
- Defesa em profundidade: operações em massa e destrutivas em `src/services/*` ganham `eq("client_id", clientId)` explícito. O parâmetro `clientId: string` é obrigatório e vem antes de `masterView` (padrão `false`), como nas leituras.
- Master view (master no subdomínio "master", opera entre tenants) pula o filtro, igual às leituras `listPipelines`, `listTasks` etc. Nos componentes, `useTenantScope` deriva `{ clientId, masterView }` com a mesma regra de `useAppScope`.
- Fora de escopo: updates de linha única por id, inserts e leituras. Esses seguem só com RLS.
- Sem mudança de SQL, RLS ou edge functions.

Funções alteradas:
- `src/services/leads.ts`: `bulkMoveLeads`, `bulkDeleteLeads`, `bulkDeleteLeadsLogOnly`, `bulkUpdateLeadStandardField`, `bulkAddTag` (select e updates), `reassignLeadRelations`, `reassignAndMergePrimary` (3 updates em massa; o update do lead primário é por id e não muda), `reassignTasksToLead`, `reassignTimelineToLead`, `deleteColumnsByPipeline`.
- `src/services/inbox.ts`: `markConversationsRead`, `markConversationsUnread`, `updateConversationsStatus`, `reassignConversationsToLead`.

Exceções conscientes:
- `bulkUpdateLeadCustomField` usa a RPC `bulk_update_lead_custom_field`; o filtro pertence ao SQL, que não foi alterado.
- `reassignNotesToLead` não ganhou filtro: a tabela `notes` não tem schema versionado nem tipos gerados, e a coluna `client_id` não foi confirmada. Fica só com RLS. A função não tem chamador em `src` (o merge do inbox usa chamada direta em `useInbox.ts`).

## Consequências
- Todo chamador passa o tenant. Em caso de `clientId` vazio o filtro não casa nenhuma linha (falha fechada), e `deleteLead`/`mergeLeads` abortam com erro explícito.
- Se um dia a RLS falhar nessas operações, o filtro no código limita o dano ao tenant do usuário.
- Custo: um parâmetro a mais nas assinaturas e um `eq` por query; sem impacto de performance (há índices com `client_id`).
- Pendente (decisão do Rael): avaliar `notes` e a RPC de campo customizado, e o merge direto em `useInbox.ts`.

## Referências
- `src/services/leads.ts`, `src/services/inbox.ts`, `src/hooks/useTenantScope.ts`
- `src/test/services/leads.test.ts`, `src/test/services/inbox.test.ts`
- ADR-UPX-002, ADR-UPX-004
