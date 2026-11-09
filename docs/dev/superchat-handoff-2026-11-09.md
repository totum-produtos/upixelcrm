# SUPERCHAT HANDOFF
Data: 2026-11-09 15:45 UTC
Chat de origem: uPixel CRM, adequação BuildOps (Forja v1.1) e migração da produção para o Supabase self-hosted + WhatsApp OpenWA
Agente/contexto: Rael com Claude Code (sessão cloud, repo `totum-produtos/upixelcrm`, branch `claude/skills-ponytail-setup-h0se67`)

## TÍTULO SUGERIDO PARA O NOVO CHAT
uPixel Self-hosted + WhatsApp v2
> Renomear à mão na interface.

## OBJETIVO DESTE CHAT
Fazer o WhatsApp (OpenWA em `zap.grupototum.com`) conectar no CRM. No caminho, descobrimos que a produção roda no Supabase **self-hosted** (`upixel.grupototum.com`, VPS Nova), não no Cloud, e subimos functions, realtime e crons lá.

## ESTADO ATUAL
**Pronto e no ar**
- Functions na VPS: container `upixel-functions` (override em `/opt/upixel-supabase/docker-compose.override.yml`), com roteador de JWT. Deploy: `cd /opt/upixel-src && git pull -q && rsync -a --delete supabase/functions/ /opt/upixel-supabase/functions/ && docker restart upixel-functions`.
- Crons (fila WhatsApp, health-check, automation-worker) apontando para `http://kong:8000` e respondendo 200. Automações rodando (#137).
- Correções do WhatsApp, todas mergeadas e no ar (último rsync em 09/11 15:40):
  - #139: coluna `instance_name`.
  - #140: remover de verdade e nome de sessão único.
  - #141: espera o QR.
  - #143: `tenant_id` nas ações do card e health-check do OpenWA.
- OpenWA validado de ponta a ponta pelo script `deploy/selfhosted/scripts/teste-whatsapp-real.sh`: criar 201, start 200, QR 200, apagar 204.
- Webhook do OpenWA chegando no CRM (`session.status` da sessão `945c6105...`, card "Teste").

**Ainda não confirmado pelo Rael no CRM**
- Remover o "Matheus" depois do #143.
- Escanear o QR do card "Teste" e ver o número conectar.
- Banner "servidor inacessível" sumindo depois do próximo ciclo do health-check.

**Quebrado**
- Websocket do realtime. O log de `upixel-realtime` mostra `TenantNotFound: realtime-dev`. O roteamento já foi corrigido (antes o erro era `realtime`), mas o tenant `realtime-dev` não existe na tabela do Realtime. Hipótese: a seed (`SEED_SELF_HOST`) não rodou ou criou outro nome.
- `automation-worker` 403 no console do navegador. O frontend chama uma function que só aceita a cron. É inofensivo e já acontecia antes, fica para limpeza depois.

## DECISÕES TOMADAS
- A produção fica no self-hosted. O Cloud (`xusdhzwfkzufupjwbebt`) é legado e será apagado só depois do checklist em `deploy/selfhosted/README.md`.
- A stack da VPS é alterada só via override e `functions.env`. O compose principal nunca é sobrescrito.
- As secrets das functions ficam em `/opt/upixel-supabase/functions.env`, com chmod 600 e **valores entre aspas simples** (o compose corta o `$`).
- Webhooks sem JWT seguem o `verify_jwt = false` do `supabase/config.toml`. Há um teste que garante isso.
- Mexer em schema, RLS ou dados de produção exige aprovação do Rael.

## DADOS TÉCNICOS CRÍTICOS
- VPS: stack `/opt/upixel-supabase`, projeto compose `upixel-selfhosted`, repo clonado em `/opt/upixel-src`.
- Containers: `upixel-db`, `upixel-kong`, `upixel-realtime`, `upixel-functions`, `upixel-auth`, `upixel-rest`, `upixel-storage`, `upixel-meta`.
- Backups:
  - `*.bak-20261108-140825` (compose, `kong.yml`, `.env`)
  - `/root/cron-backup-20261108-141347.tsv`
  - `/root/.totum/backups/integrations-f58950f1-*.json`
- OpenWA: `https://zap.grupototum.com`, atrás do Basic Auth do Traefik. As sessões `claudia` e `miguel` são de **outros sistemas**: não apagar.
- Tenant `totum`: `client_id` `c637af73-096c-4bff-87d1-7f98a46a0cbf`.
- Integrações antigas para limpar: `971df672` (503), `7c699e27` (Meta com token expirado), `dbfe8ad7` (sem configuração).
- Docs: `docs/dev/HANDOFF-SELFHOSTED-2026-11-08.md` (estado completo, rollback) e `deploy/selfhosted/README.md`.

## CONTEXTO TOTUM ATIVO
uPixel CRM em produção. As regras da Forja v1.1 valem: tamanho P/M/G, escopo fechado, rollback documentado e revisão humana em G.

## SKILLS ATIVAS NESTE CHAT
totum-buildops-orchestrator, ponytail, superchat-totum.

## PRÓXIMOS PASSOS
1. **Realtime:** na VPS, ver quais tenants existem:
   ```bash
   docker exec -i upixel-db psql -U supabase_admin -d postgres -tAc "select external_id, name from _realtime.tenants;"
   ```
   - Se a tabela estiver vazia, criar o tenant `realtime-dev` (pela API de tenants do Realtime ou reiniciando com `SEED_SELF_HOST=true`).
   - Se existir com outro nome, trocar o alias no override e o host no `kong.yml` para esse nome.
2. Confirmar no CRM: remover o "Matheus", escanear o QR do "Teste" e mandar uma mensagem de outro número para ver se ela aparece no Inbox.
3. **Segurança:**
   - Revogar a `sb_secret_` do Supabase Cloud, que foi exposta no chat.
   - Rotacionar as senhas do Traefik e dos monitores.
   - Criar uma chave do OpenWA só para o CRM.
4. **Deploy automático das functions:** o Rael cadastra o secret `VPS_SSH_KEY` no GitHub, e então o `deploy.yml` é trocado para rsync via SSH.
5. **Limpeza e checagens:**
   - Integrações antigas (contar as conversas ligadas antes de apagar).
   - Sessões `upixel-...` órfãs no OpenWA.
   - Backfill opcional de `instance_name` (os SQLs estão no #139).
   - Testar as outras functions contra o PostgREST 12.
6. Remover a chamada ao `automation-worker` que o frontend faz no navegador e que volta 403.

## SKILLS SUGERIDAS PARA O NOVO CHAT
1. `totum-skills:systematic-debugging`: para fechar a causa do realtime sem chute.
2. `ponytail:ponytail`: menor mudança possível em produção.
3. `totum-skills:verificar-totum`: checar antes de declarar "pronto".
4. `supabase`: para o tenant do Realtime e as políticas.

## MODELO RECOMENDADO PARA O NOVO CHAT
🤖 MODELO SUGERIDO: Claude Code (Opus)
Motivo: o trabalho é de infra e código em produção, com shell na VPS e PRs.
Alternativa: Claude Code (Sonnet), para as tarefas mecânicas de limpeza.

## PROMPT DE ABERTURA DO NOVO CHAT
---
🔁 SUPERCHAT TOTUM: RETOMADA

Leia `docs/dev/superchat-handoff-2026-11-09.md` e `docs/dev/HANDOFF-SELFHOSTED-2026-11-08.md` no repo `totum-produtos/upixelcrm` (branch `main`). A produção é o Supabase self-hosted em `upixel.grupototum.com`. Eu rodo os comandos na VPS e te colo a saída. Você não tem acesso direto à VPS.

SKILLS PARA ATIVAR: `/ponytail`, `totum-skills:systematic-debugging`, `totum-skills:verificar-totum`.

Confirme o carregamento e comece pelo item 1 dos Próximos Passos (realtime `TenantNotFound: realtime-dev`): me passe o comando de diagnóstico.
---
