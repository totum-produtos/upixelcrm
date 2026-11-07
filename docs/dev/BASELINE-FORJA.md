# Baseline Forja v1.1 (RETROATIVO)

**RETROATIVO:** medido em 2026-11-07, depois do trabalho feito. Commit `9d9f572` = baseline (antes) e `main` atual = depois.
Não é uma medição feita antes de começar; serve como ponto de comparação a partir de agora.

## npm audit (todas as severidades, dev incluso)

| Ponto | Total | Critical | High | Moderate |
|---|---|---|---|---|
| Baseline `9d9f572` | 29 | 2 | 11 | 16 |
| `main` atual | 31 | 2 | 11 | 18 |

- Os 2 critical são vitest/tinypool (apenas dev, fora do bundle de produção).
- Entre os high há dompurify, zod, vite e postcss diretos.
- O job `deps-audit` do PR falha só em critical de produção (`--omit=dev`); o resumo completo fica no `$GITHUB_STEP_SUMMARY`.

## Lighthouse (build com env dummy, `vite preview` em 127.0.0.1, Lighthouse 12, mobile padrão, 3 execuções)

| Métrica | Baseline 9d9f572 (3 runs) | main 984ed91 (3 runs) | Meta Forja |
|---|---|---|---|
| Performance | 76 / 78 / 77 (mediana 77) | 76 / 76 / 76 (mediana 76) | >= 90 |
| LCP | 4182 / 4110 / 4107 ms | 4365 / 4368 / 4369 ms | <= 2500 ms |
| TBT | 115 / 68 / 100 ms | 94 / 64 / 31 ms | <= 200 ms |
| CLS | 0 | 0 | <= 0,1 |

Leitura:
- A primeira medição de TBT (280 ms) era ruído; com 3 execuções o TBT ficou igual ou melhor.
- **LCP piorou de forma consistente em cerca de 260 ms (+6%)** e a nota caiu 1 ponto. Causa não identificada: o chunk `index` cresceu só 3,3 kB (as fatias do AppContext), o que não explica sozinho a diferença. Registrado como regressão a investigar.
- A meta de LCP (2,5 s) já falhava no baseline. O que pesa é débito anterior: a landing pré-carrega `vendor-charts` (400 kB) e `vendor` (808 kB) sem precisar deles. Corrigir isso está fora do escopo desta adequação e fica para decisão do Rael.

## Semgrep

Baseline virá da primeira execução no CI (o registry semgrep.dev é bloqueado no ambiente do agente, então não foi possível medir localmente). O job falha apenas por achados novos (`--baseline-commit`); o total da árvore vai para o resumo do job.

## Achados dos testes pgTAP (estáticos, antes do primeiro run no CI)

| Item | Achado | Severidade |
|---|---|---|
| cb05 | A migration 20261029 tem erro de sintaxe (`CREATE POLICY` sem `ON public.integrations`) e referencia colunas que não existem (`name`, `api_key`). Ela falha inteira, então o fix provavelmente nunca foi aplicado no Cloud | Alta |
| cb05 | Mesmo corrigida: `REVOKE SELECT (coluna)` não tem efeito com o GRANT de tabela padrão do Supabase, e a view `integrations_safe` sem `security_invoker` vazaria integrações de todos os tenants | Alta |
| cb09 | A função de merge faz `UPDATE messages SET lead_id`, coluna que não existe: quebra em runtime. Também não valida tenant | Alta |
| cb08/cb09 | REVOKE só de authenticated/anon, não de PUBLIC | Média |
| migrations | Não aplicam do zero: versões duplicadas, 37 arquivos sem prefixo de 14 dígitos, `CREATE TABLE profiles` repetido. Por isso o job `db-tests` está como não bloqueante | Média |

Tudo isso é schema/RLS (área G): nada foi corrigido, aguarda aprovação do Rael ou do Kleber.
