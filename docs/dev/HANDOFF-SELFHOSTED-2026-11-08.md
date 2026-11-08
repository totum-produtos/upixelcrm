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
| Docs dizendo que produção era Cloud | #138 | aguardando merge |

Backups na VPS: `*.bak-20261108-140825` (compose, `kong.yml`, `.env`) e `/root/cron-backup-20261108-141347.tsv`.

## 2. O que falta para o WhatsApp conectar (você, 2 min)

As secrets do OpenWA chegaram no container com **tamanho 1**. O `docker compose` interpreta `$` dentro do `env_file`: se a chave ou a senha tem `$`, tudo depois some. Valor entre **aspas simples** não é interpretado.

1. `nano /opt/upixel-supabase/functions.env` e deixe assim (valores reais, já rotacionados):
   ```
   UPIXEL_WA_TYPE=openwa
   UPIXEL_WA_URL=https://zap.grupototum.com
   UPIXEL_WA_KEY='chave-da-api-do-openwa'
   UPIXEL_WA_BASIC_AUTH='usuario:senha-do-traefik'
   ```
   Sem espaço em volta do `=`. Se o valor tiver aspas simples dentro, me avise.
2. Recriar e conferir (mostra só o tamanho):
   ```bash
   cd /opt/upixel-supabase && docker compose -p upixel-selfhosted up -d --force-recreate functions
   docker exec upixel-functions sh -c 'for v in UPIXEL_WA_KEY UPIXEL_WA_BASIC_AUTH; do eval "x=\$$v"; echo "$v tamanho=${#x}"; done'
   ```
   Os tamanhos têm que bater com o comprimento real da chave e de `usuario:senha`.
3. totum.upixel.app/whatsapp, botão **"Adicionar WhatsApp Web"**. Se der erro: texto do toast + `docker logs --tail 20 upixel-functions`.

## 3. Segurança (urgente)

- **Revogar a secret key do Supabase Cloud** (`sb_secret_...`): apareceu em texto puro no chat ao listar as crons. Painel do Cloud, Settings, API Keys.
- Rotacionar a senha do Traefik e a chave da API do OpenWA, que também foram coladas no chat antes.
- 14 segredos antigos no histórico do git (relatório do job `secret-scan`), pendência do Sentinela.

## 4. Próximos passos

1. **Deploy automático das functions na VPS.** Hoje é manual:
   `cd /opt/upixel-src && git pull && rsync -a --delete supabase/functions/ /opt/upixel-supabase/functions/ && docker restart upixel-functions`.
   Para virar CI: criar uma chave SSH só de deploy, cadastrar como secret `VPS_SSH_KEY` no GitHub, e eu troco o `deploy.yml` (hoje ainda publica no Cloud, inútil).
2. **Secrets restantes** no `functions.env` (Asaas, Meta, Google, VAPID, `CRON_SECRET`, `ALLOWED_ORIGINS`, `WHATSAPP_APP_SECRET`), vindas do cofre. Lista completa em `deploy/selfhosted/.env.example`. Mesma regra das aspas simples.
3. **Webhooks externos** (Meta, Asaas, Instagram): conferir se estão cadastrados com a URL do Cloud e trocar para `upixel.app/functions/v1/...` (o rewrite já aponta para a VPS).
4. **Limpeza de integrações antigas** (health-check): card "Matheus" em `whatsapp.grupototum.com` offline há 91 dias, duas instâncias com 503, uma Meta com token expirado, uma sem configuração.
5. **Apagar o Cloud** só depois do checklist em `deploy/selfhosted/README.md` (dados, storage, secrets, webhooks, pausa de 7 dias).

## 5. Riscos conhecidos

- Outras functions ainda não foram exercitadas no PostgREST 12 do self-hosted; pode haver incompatibilidade parecida com a do `automation-worker`.
- `docker logs upixel-functions` mostra pouco dos workers; se um erro não aparecer, ajusto o roteador para logar falhas.
- O compose da VPS diverge do repo (Kong também na rede `coolify`); mudanças lá continuam via override, nunca sobrescrevendo o compose.

## 6. Rollback

- Functions: `rm /opt/upixel-supabase/docker-compose.override.yml && docker rm -f upixel-functions`, restaurar `volumes/api/kong.yml.bak-20261108-140825`, `docker restart upixel-kong`.
- Crons: reaplicar os comandos de `/root/cron-backup-20261108-141347.tsv` com `cron.alter_job` (voltam a chamar o Cloud).
- PRs #136, #137, #138: botão "Revert".
