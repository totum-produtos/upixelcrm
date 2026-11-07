# ADR-UPX-003: Credenciais fora do repositório e do bundle

**Status:** Aceita
**Data:** 2026-11-07 (formaliza prática existente)

## Contexto
O sistema integra WhatsApp, Meta, Google, Asaas e Supabase, o que gera muitos tokens. Evidências:
- `.gitignore` bloqueia `.env`, `.env.*` (exceto `.env.example`) e `.env.migration`.
- `AUDITORIA-API-KEYS.md` (2026-08-21) varreu `src/**` e `supabase/functions/**` por padrões de chave e não achou segredo. O único literal sensível-ish é um UUID de tenant (ID, não credencial).
- `.github/workflows/deploy.yml` lê tudo de `secrets.*` do GitHub (`SUPABASE_ACCESS_TOKEN`, `VITE_*`).
- `docs/CLEANUP_REPORT.md` registra que `read_secret` do Vault estava legível por `anon` e foi revogada em produção.
- `SEGURANCA-MCP-SUPABASE.md` e o commit `c242675` tornaram o conector MCP do Supabase somente leitura (`read_only=true`).
- Commit `1a8f268` (cb-03) exige cron secret nos workers internos.

## Decisão
Nenhuma credencial entra no repositório, em docs, em logs ou no bundle do frontend. Só variáveis `VITE_*` públicas (URL e chave publishable) vão ao cliente. Segredos ficam em GitHub Secrets, secrets das edge functions e Vault do Supabase. A gestão do Vault é do Sentinela. Acesso de agentes ao banco é somente leitura.

## Consequências
- Rotação de segredo é decisão do Rael com o Sentinela, nunca de agente.
- Documentos como `PROJECT_CARD.md` podem citar o project ref (identificador público), jamais chaves ou tokens.
- O Semgrep da Fase 3 (item 3.5 do plano) deve cobrir secrets como regra bloqueante.
- Os 3 `.sql` da raiz e `migrations-pending/` precisam de revisão do Sentinela antes de arquivar (item 2.3).

## Referências
- `.gitignore`, `.github/workflows/deploy.yml`, `AUDITORIA-API-KEYS.md`
- `SEGURANCA-MCP-SUPABASE.md`, `docs/CLEANUP_REPORT.md`
- Commits `c242675`, `1a8f268`
