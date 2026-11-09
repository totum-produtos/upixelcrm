# Handoff: produção no Supabase self-hosted, 2026-11-08

**Para:** Rael
**Contexto:** o "Gerar QR Code" do WhatsApp dava `name resolution failed`. A causa não era o código: a produção usa o Supabase **self-hosted** (`upixel.grupototum.com`, VPS Nova), e lá não havia container de edge functions. Todo deploy de function ia para o Cloud (`xusdhzwfkzufupjwbebt`), que a produção não usa.

---

## 1. O que já está feito

| Item | Onde | Status |
|---|---|---|
| Roteador de functions com verificação de JWT e allowlist de webhooks | #135, `deploy/selfhosted/volumes/functions/main` | ✅ no ar |
| Container `upixel-functions` (edge-runtime v1.74.0) | VPS, `docker-compose.override.yml` | ✅ no ar |
| Realtime (`TenantNotFound: realtime`) | alias `realtime-dev.supabase-realtime` + `kong.yml` | ✅ corrigido |
| Crons `whatsapp-queue-processor`, `whatsapp-health-check`, `automation-worker` | antes chamavam o Cloud; agora `http://kong:8000` com a service role do self-hosted | ✅ respondem 200 |
| `automation-worker` quebrado no PostgREST 12 | #137 (`order` explícito no claim) | ✅ automações rodando |
| Frontend com URL fixa do Cloud (Google OAuth, Instagram, RAG, rewrites `/functions/v1`) | #136 | ✅ mergeado |
| Docs dizendo que produção era Cloud | #138 | ✅ mergeado |
| Secrets do OpenWA cortadas pelo `$` no `env_file` | `functions.env` com aspas simples (KEY 71, BASIC_AUTH 30) | ✅ |
| "Erro ao salvar instância" (23505): coluna `instance_name` vazia | #139 | ✅ mergeado |
| "Número removido" sem remover; 409 por sessão órfã no OpenWA | #140 (delete por `integration_id`, nome de sessão único, limpeza da órfã) | ✅ mergeado |
| Modal sem QR (QR pedido antes do motor do OpenWA carregar) | #141 (`pollQr`, até ~15 s) | ✅ mergeado, falta rsync na VPS |
| Teste real do OpenWA na VPS | `deploy/selfhosted/scripts/teste-whatsapp-real.sh` | ✅ criar 201, start 200, QR 200, apagar 204 |

Backups na VPS: `*.bak-20261108-140825` (compose, `kong.yml`, `.env`) e `/root/cron-backup-20261108-141347.tsv`.

## 2. O que falta para o WhatsApp conectar (você, 5 min)

1. Publicar o #141 na VPS:
   ```bash
   cd /opt/upixel-src && git pull -q && rsync -a --delete /opt/upixel-src/supabase/functions/ /opt/upixel-supabase/functions/ && docker restart upixel-functions
   ```
2. totum.upixel.app/whatsapp, Ctrl+Shift+R. Remover os cards "Desconectado" que sobraram das tentativas (o remover agora apaga de verdade ou mostra o erro).
3. "Adicionar WhatsApp Web": o QR aparece em 5 a 10 s. Escanear em WhatsApp, Aparelhos conectados.
4. Se falhar: texto do toast + `docker logs --since 3m upixel-functions 2>&1 | grep -vE "health|queue|Checking|✓"`.

Diagnóstico a qualquer momento: `bash /opt/upixel-src/deploy/selfhosted/scripts/teste-whatsapp-real.sh totum`.

Limpeza no OpenWA: as tentativas sem QR deixaram sessões `upixel-...` e a órfã `teste` (`4aa4a884-...`). **Não apagar** `claudia` (conectada) nem `miguel`: são de outros sistemas que usam o mesmo OpenWA.

## 3. Segurança (urgente)

- **Revogar a secret key do Supabase Cloud** (`sb_secret_...`): apareceu em texto puro no chat ao listar as crons. Painel do Cloud, Settings, API Keys.
- Rotacionar a senha do Traefik do zap e a dos monitores (`TOTUM_MONITOR_BASICAUTH_PASSWORD`), coladas no chat. Depois, regravar o `functions.env` (aspas simples) e recriar `upixel-functions`.
- Chave OpenWA própria para o CRM: hoje é a mesma do `alert.sh` e de outros sistemas (sessões `claudia`, `miguel`); trocar uma derruba todos.
- 14 segredos antigos no histórico do git (relatório do job `secret-scan`), pendência do Sentinela.

## 4. Próximos passos

1. **Deploy automático das functions na VPS.** Hoje é manual:
   `cd /opt/upixel-src && git pull && rsync -a --delete supabase/functions/ /opt/upixel-supabase/functions/ && docker restart upixel-functions`.
   Para virar CI: criar uma chave SSH só de deploy, cadastrar como secret `VPS_SSH_KEY` no GitHub, e eu troco o `deploy.yml` (hoje ainda publica no Cloud, inútil).
2. **Secrets restantes** no `functions.env` (Asaas, Meta, Google, VAPID, `CRON_SECRET`, `ALLOWED_ORIGINS`, `WHATSAPP_APP_SECRET`), vindas do cofre. Lista completa em `deploy/selfhosted/.env.example`. Mesma regra das aspas simples.
3. **Webhooks externos** (Meta, Asaas, Instagram): conferir se estão cadastrados com a URL do Cloud e trocar para `upixel.app/functions/v1/...` (o rewrite já aponta para a VPS).
4. **Limpeza de integrações antigas** (health-check): uma instância com 503 (`971df672`), uma Meta com token expirado (`7c699e27`), uma sem configuração (`dbfe8ad7`). O "Matheus" (`f58950f1`) já foi apagado. Contar conversas ligadas antes de apagar qualquer uma.
5. **Backfill opcional** da coluna `instance_name` nas linhas antigas (SQL e `count` prévio na descrição do #139). Altera dados de produção: só com aprovação.
6. **Apagar o Cloud** só depois do checklist em `deploy/selfhosted/README.md` (dados, storage, secrets, webhooks, pausa de 7 dias).

## 5. Riscos conhecidos

- Outras functions ainda não foram exercitadas no PostgREST 12 do self-hosted; pode haver incompatibilidade parecida com a do `automation-worker`.
- `docker logs upixel-functions` mostra pouco dos workers; se um erro não aparecer, ajusto o roteador para logar falhas.
- O compose da VPS diverge do repo (Kong também na rede `coolify`); mudanças lá continuam via override, nunca sobrescrevendo o compose.

## 6. Rollback

- Functions: `rm /opt/upixel-supabase/docker-compose.override.yml && docker rm -f upixel-functions`, restaurar `volumes/api/kong.yml.bak-20261108-140825`, `docker restart upixel-kong`.
- Crons: reaplicar os comandos de `/root/cron-backup-20261108-141347.tsv` com `cron.alter_job` (voltam a chamar o Cloud).
- PRs #136 a #141: botão "Revert" (os de function pedem o rsync na VPS depois).
