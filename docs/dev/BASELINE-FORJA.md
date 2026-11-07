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

## Lighthouse (build com env dummy, `vite preview` em 127.0.0.1:4173, Lighthouse 12, 1 execução, mobile padrão)

| Métrica | Baseline `9d9f572` | `main` atual | Meta |
|---|---|---|---|
| Performance | 78 | 71 | >= 90 |
| Accessibility | 100 | 100 | n/a |
| Best Practices | 96 | 96 | n/a |
| SEO | 100 | 100 | n/a |
| LCP | 4,1 s | 4,2 s | <= 2,5 s |
| CLS | 0 | 0 | <= 0,1 |
| TBT | 30 ms | 280 ms | <= 200 ms |
| FCP | 3,8 s | 3,9 s | n/a |

Leitura: com uma execução só, TBT e Performance variam bastante entre rodadas; a diferença de TBT (30 vs 280 ms) pode ser ruído. O ponto firme é que LCP (~4 s) está acima da meta nos dois pontos. O bundle principal (`vendor`) tem ~808 kB (253 kB gzip).
Por isso o job `lighthouse` está como `continue-on-error: true` até a baseline real do CI ser conhecida.

## Semgrep

Baseline virá da primeira execução no CI (o registry semgrep.dev é bloqueado no ambiente do agente, então não foi possível medir localmente). O job falha apenas por achados novos (`--baseline-commit`); o total da árvore vai para o resumo do job.
