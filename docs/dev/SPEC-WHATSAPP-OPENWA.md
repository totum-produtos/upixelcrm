# SPEC: Conectar número WhatsApp ao uPixel CRM via OpenWA (zap.grupototum.com)

Status: diagnóstico estático (sem acesso a zap.grupototum.com, Supabase ou secrets). Nada implementado. Área sensível (integração crítica + webhook): IA sugere, humano aprova.
Data: 2026-11-07. Commits relevantes: fcd3703 (webhook por sessão + rota message.received), 059f4c9 (migração do proxy para OpenWA).

## 1. Fluxo atual ponta a ponta

1. Front: `QuickConnectWizard.tsx:313-318` chama `supabase.functions.invoke("whatsapp-proxy?action=create-managed-instance", { body: { name, tenant_id } })` (JWT do usuário no header Authorization).
2. Proxy (`whatsapp-proxy/index.ts`): exige Bearer + `auth.getUser()` + profile (linhas 119-136), resolve `tenantId` (body > profile.tenant_id > client_id) e usa service role para gravar.
3. `create-managed-instance` (linhas 208-300), só entra no ramo OpenWA se `UPIXEL_WA_TYPE=openwa` (linha 54/235):
   - `POST {URL}/api/sessions` body `{ name }` -> espera `{ id }` (linhas 236-250).
   - `POST {URL}/api/sessions/{id}/start` (linha 252; resposta ignorada).
   - INSERT em `integrations`: `provider="whatsapp"`, `status="connecting"`, `client_id=tenant_id`, `config = { api_url, instance_name=id, session_id=id, wa_type:"openwa", api_key, friendly_name, managed:true }` (linhas 258-270).
   - `ensureOpenWAWebhook` (91-117): `GET /api/sessions/{id}/webhooks`, se não tem a URL então `POST` body `{ url, events:["message.received","session.status","session.disconnected"] }`. URL = `{SUPABASE_URL}/functions/v1/whatsapp-webhook?integration_id=<uuid da linha>`. Resultado gravado em `config.webhook_url / webhook_registered / webhook_error` (linhas 280-283).
   - `GET /api/sessions/{id}/qr`; lê `.qr || .qrCode || .base64` (linhas 286-291); devolve `qr_code` + `instance_name`.
4. Headers de todas as chamadas ao OpenWA (`waAuthHeaders`, 73-82): `X-API-Key: <key>` e, se existir `UPIXEL_WA_BASIC_AUTH` ("user:senha") ou `UPIXEL_WA_BASIC_USER`+`PASS`, `Authorization: Basic ...`. Sem Bearer.
5. Front mostra o QR (`<img src={qrCode}>`, linha 129) e faz polling a cada 3 s de `action=status&instance_name=<id>` (`QuickConnectWizard.tsx:294-309`). "Atualizar QR" é manual (`action=connect`, 340-352).
6. `status` (proxy 844-880): `GET /api/sessions/{id}`; `status==="ready"` -> `connected`, `disconnected` -> `disconnected`, resto -> `connecting`; grava em `integrations.status` e `config.connected_number` (`phone`). Wizard só avança com `res.status==="connected"`.
7. `connect` (proxy 633-690): GET sessão (404 -> recria), re-registra webhook, `POST /start`, GET sessão, se `ready` conecta, senão `GET /qr`.
8. Inbound: OpenWA faz POST em `whatsapp-webhook?integration_id=...` com `{ event, sessionId, data }`. `whatsapp-webhook/index.ts:1429-1440` roteia `message.received | session.status | session.disconnected` para `handleOpenWAWebhook` (1221). Auth: NENHUMA nesta rota. `verifyIntegrationWebhookToken` (`_shared/webhookAuth.ts:14`, token em query `webhook_token|token|apikey` ou header `x-webhook-token|x-api-key`, comparado a `config.webhook_token`) só é usado nas rotas Evolution (linhas 942, 1466). A proteção hoje é só o `integration_id` UUID + rate limit (1385-1394).
9. Envio: `POST /api/sessions/{id}/messages/send-text` body `{ chatId: "<fone>@c.us", text }` (proxy 1000-1004). Mídia OpenWA: 501 (1116-1119).

## 2. Checklist de pré-condições (verificar amanhã)

Secrets da Edge Function `whatsapp-proxy` (`supabase secrets list`, só nomes):
- [ ] `UPIXEL_WA_TYPE=openwa` (valor exato, minúsculo/maiúsculo tanto faz). OBRIGATÓRIO: sem ele o botão cai no ramo Evolution (`/instance/create`).
- [ ] `UPIXEL_WA_URL=https://zap.grupototum.com` (sem `/api`, sem barra final; barra final é removida na linha 209, `/api` NÃO é removido e geraria `/api/api/sessions`). Precedência: `UPIXEL_WA_URL` > `UPIXEL_OPENWA_URL` > `UPIXEL_EVOLUTION_URL`. Se `UPIXEL_EVOLUTION_URL` antigo existir e `WA_URL` não, aponta para o servidor errado.
- [ ] `UPIXEL_WA_KEY` (ou `UPIXEL_OPENWA_KEY`) = a chave que o OpenWA espera em `X-API-Key`. Mesma precedência.
- [ ] Se o Traefik/Coolify do zap tem Basic Auth: `UPIXEL_WA_BASIC_USER` + `UPIXEL_WA_BASIC_PASS` (ou `UPIXEL_WA_BASIC_AUTH=user:senha`). Se NÃO tem, não definir (header Basic errado também dá 401).
- [ ] `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (injetados pelo Supabase).
- [ ] Função `whatsapp-proxy` deployada com o código dos commits fcd3703/059f4c9 (produção já teve versão antiga com webhook em `/api/webhooks`, ver `tmp/OPENWA_INTEGRATION_PENDING.md`). Conferir versão/data do deploy no painel.

Servidor OpenWA (VPS):
- [ ] `GET https://zap.grupototum.com/api/sessions` com `X-API-Key` responde 200 a partir da internet (e a partir do egress do Supabase).
- [ ] `/opt/OpenWA/.env` `SSRF_ALLOWED_HOSTS` inclui `xusdhzwfkzufupjwbebt.supabase.co` (senão o registro do webhook devolve "Destination address is not allowed"). Reiniciar OpenWA após editar.
- [ ] OpenWA alcança `https://xusdhzwfkzufupjwbebt.supabase.co/functions/v1/whatsapp-webhook` (DNS + saída 443 da VPS).
- [ ] Chromium/engine do OpenWA sobe e gera QR (`GET /api/sessions/{id}/qr` retorna 200 com sessão em estado de QR).

Supabase:
- [ ] `supabase/config.toml`: `[functions.whatsapp-webhook] verify_jwt = false` (linha 5-6, OK; o OpenWA não manda JWT). `whatsapp-proxy` NÃO está no config.toml, então usa o default `verify_jwt = true`, correto, pois o front sempre manda JWT. Conferir no painel que o deploy do webhook não foi feito com `--verify-jwt`.
- [ ] CORS: `_shared/cors.ts` usa `ALLOWED_ORIGINS` env ou `*`. Se `ALLOWED_ORIGINS` estiver setada, tem que incluir `https://<tenant>.upixel.app` e `totum.upixel.app` (senão o `invoke` do navegador falha antes de chegar no proxy). Webhook servidor-a-servidor não é afetado.
- [ ] Usuário logado tem `profiles.tenant_id` ou envia `tenant_id` (master): front já envia.

## 3. Hipóteses ranqueadas para "não consigo conectar"

| # | Hipótese | Evidência no código | Como confirmar / descartar |
|---|---|---|---|
| 1 | `UPIXEL_WA_TYPE` ausente (ou secrets `UPIXEL_WA_URL/KEY` ausentes/erradas): botão cai no ramo Evolution ou devolve 503 "não configurado". | `whatsapp-proxy:54,235` (gate pelo env); `:219-231` (503); ramo Evolution `/instance/create` em `:299+` retorna 404/401 no zap. | `supabase secrets list` (nomes; conferir os 3). Log da função: mensagem "Evolution create failed" = hipótese confirmada; "Servidor WhatsApp gerenciado não configurado" = URL/KEY faltando. |
| 2 | Auth do servidor: key errada, ou Basic Auth do Traefik não configurado/errado (401 em `/api/sessions`). | `waAuthHeaders` 73-82; create devolve 502 com `HTTP 401` (`:243-245`). Em `connect`/`status` o 401 vira "connecting" silencioso (ver bug B3). | `curl -i https://zap.grupototum.com/api/sessions -H "X-API-Key: $KEY"` (200 = ok). Se 401 com HTML/`WWW-Authenticate: Basic`, falta Basic: repetir com `-u user:senha`. Testar também sem Basic para saber se ele existe. |
| 3 | Sessão criada, mas QR nunca aparece / não escaneável: QR ainda não pronto quando buscado, e formato (string crua, não data URL) incompatível com `<img src>`. | `:252-256` start sem await de estado; `:286-291` GET qr uma vez, só `qr||qrCode||base64`; `QuickConnectWizard:129` usa o valor direto em `<img src>`; polling (294-309) só consulta `status`, nunca o QR. | `curl -X POST .../api/sessions -d '{"name":"teste"}'`, `.../start`, depois `curl .../api/sessions/{id}/qr` a cada 2 s por 20 s; ver nome do campo e se vem `data:image/png;base64,...` ou texto cru. Apagar a sessão de teste depois. |
| 4 | `name` rejeitado (400) pelo OpenWA: o CRM manda o nome amigável cru ("Claudia Atendimento"), sessão de produção usa slug (`cludia-atendimento`). | `:229,238` `name: friendlyName` sem slug. | `curl -X POST .../api/sessions -d '{"name":"Claudia Atendimento"}'` vs `"claudia-atendimento"`; ver status/body do erro (aparece no toast como `details`). |
| 5 | Conecta mas não recebe: webhook não registrado (SSRF_ALLOWED_HOSTS ou sem rota) - usuário percebe "não funciona". | `:91-117` grava `webhook_error`; nada na UI lê isso para openwa (`grep webhook_error src` só Cloud/Instagram). | `select id, status, config->>'webhook_registered', config->>'webhook_error' from integrations where provider='whatsapp' order by updated_at desc limit 5;` e `curl .../api/sessions/{id}/webhooks -H "X-API-Key: $KEY"`. |
| 6 | Falha de rede Supabase -> zap (DNS/TLS/firewall/proxy da VPS). | `isConnectionTimeout` (`:16-21`); no `create` não há try/catch próprio (cai no catch global, erro genérico). | Logs da função (Supabase > Edge Functions > whatsapp-proxy > Logs) por "tcp connect error/certificate". De fora: `curl -vI https://zap.grupototum.com/api/sessions`. |
| 7 | CORS/JWT no navegador (`ALLOWED_ORIGINS` restritivo, sessão expirada): `invoke` falha antes do proxy. | `_shared/cors.ts:2`; proxy 401 em `:119-130`. | Aba Network do navegador: preflight OPTIONS 200? resposta 401? Secrets: existe `ALLOWED_ORIGINS`? |

## 4. Bugs vistos estaticamente (caminho OpenWA)

| ID | Onde | Problema | Correção mínima | Teste que cobre |
|---|---|---|---|---|
| B1 | `whatsapp-proxy:252-256` | Resposta do `/start` ignorada: 401/400/500 não aparece; só `.catch` de rede. | Checar `startRes.ok`; se falhar, retornar 502 com `details` (e não inserir a linha, ou marcar `status:"disconnected"` + `config.last_error`). | create-managed: mock `/start` 500 -> resposta 502; mock 200 -> segue. |
| B2 | `:286-291`, `:681-686` | QR lido uma vez; sem retry; chaves aceitas `qr/qrCode/base64`; valor cru não vira data URL. | Helper `normalizeQr(data)`: aceita string ou objeto, prefixa `data:image/png;base64,` se não começar com `data:`; no `create`, repetir GET `/qr` até ~5x com 1 s se 404/400/vazio. | `normalizeQr`: string crua, data URL, `{qrCode}`, `{qr}`, `{data:{qr}}`, null. Mock fetch: qr 404 duas vezes e depois 200 -> `qr_code` preenchido. |
| B3 | `:644-660` (e `:741`, `:795`) | `checkRes` só trata 404; 401/403/5xx do GET sessão são engolidos (`await checkRes.text()`) e o fluxo segue como se existisse, escondendo a causa real. | Se `!checkRes.ok && status!==404`, retornar `{ reachable:false, error:"Servidor WhatsApp recusou (HTTP N)", details }` sem chamar `/start`. | connect: mock GET sessão 401 -> resposta com `error` contendo 401 e sem chamada a `/start`. |
| B4 | `:229,238` | `name` cru enviado ao OpenWA (hipótese 4). | Enviar slug (`friendlyName` normalizado como já feito para Evolution `:316-317`) e manter o nome amigável só em `config.friendly_name`. | create: `name:"Cláudia Atendimento"` -> body do POST `/api/sessions` com `claudia-atendimento`. |
| B5 | `QuickConnectWizard.tsx:294-309` | Polling só de `status`; se `qr_code` veio null (B2) o usuário vê tela vazia até clicar "Atualizar" (e `connect` chama `/start` de novo). | No polling, se `!qrCode`, chamar `action=connect` (ou novo `action=qr`) a cada ciclo até vir QR; ou a resposta de `status` incluir `qr` quando estado for de QR. | Teste de componente (Testing Library) com `invoke` mockado: 1º create sem QR, 2º poll devolve `base64` -> `<img>` aparece. |
| B6 | `whatsapp-webhook:1429-1440`, `1221` | Rota OpenWA sem autenticação (não usa `verifyIntegrationWebhookToken`); qualquer um com um `integration_id` injeta mensagens/status. Não impede conectar, mas é furo. | Gerar `config.webhook_token` no create/connect, registrar URL com `&token=<t>` e validar com `verifyIntegrationWebhookToken`+`extractWebhookToken` na rota OpenWA (decisão de segurança: aprovação humana). | Estender `src/test/cb02-whatsapp-webhook-auth.test.ts`: OpenWA sem token -> 401/skipped; com token certo -> processa. |
| B7 | `:844-860` | `status` com `!res.ok` devolve `reachable:false` mas HTTP 200 e sem gravar erro; UI nunca mostra "key inválida". | Incluir `http_status` na resposta e no polling parar com toast após N falhas 401/403. | status: mock 401 -> body com `http_status:401`. |
| B8 | `:848-852` | Mapa de status: só `ready`/`disconnected`; estados como `failed`, `logged_out`, `stopped` ficam "connecting" (o webhook trata, o proxy não, `webhook:1233`). | Reusar a mesma lista no proxy. | status: mock `{status:"failed"}` -> `disconnected`. |
| B9 | `:275-283` | `webhook_error` gravado mas não exibido para linhas OpenWA. | Mostrar badge "webhook falhou: <erro>" no `WhatsAppManagement`. | Teste de componente com config `webhook_registered:false`. |

Pontos que parecem corretos: path do webhook por sessão (`/api/sessions/{id}/webhooks`), `send-text` com `chatId`, ids de sessão consistentes (`instance_name == session_id`, lookup por `config->>instance_name OR session_id` em `:543-548`).

## 5. Plano de teste (antes de qualquer código)

Regra da casa: integração externa, testar antes de codar.

A. Sonda manual contra o servidor real (amanhã, com acesso, usando sessão descartável e apagando ao final): os 6 curls abaixo com `X-API-Key` (e `-u` se houver Basic). Registrar corpo real de cada resposta em `docs/` (fixtures).
   1. `GET /api/sessions` 2. `POST /api/sessions {"name":"upx-teste"}` 3. `POST /api/sessions/{id}/start` 4. `GET /api/sessions/{id}/qr` (repetir) 5. `GET/POST /api/sessions/{id}/webhooks` apontando para a URL do CRM com `integration_id` fake 6. `DELETE /api/sessions/{id}`.
   Confirmar: nome do campo do QR e formato, valores de `status` (`qr`, `ready`...), campo do telefone (`phone`?), regras de `name`, header exato (`X-API-Key`).
B. Unit (Vitest, `fetch` mockado com as respostas reais de A; estilo de `src/test/edge/*.test.ts`, extraindo funções puras para `_shared/openwa.ts`: `normalizeQr`, `mapOpenWAStatus`, `slugSessionName`, `ensureOpenWAWebhook` injetando `fetch`):
   - webhook: lista já contém a URL -> não faz POST; lista vazia -> POST com `events`; POST 400 "Destination address is not allowed" -> `{registered:false,error}` sem lançar.
   - headers: com/sem Basic, sempre `X-API-Key`, nunca `apikey`.
   - create: 401 -> 502 com HTTP 401; resposta sem `id` -> 502; start falha -> 502 (B1).
   - connect: 404 -> recria; 401 -> erro explícito (B3); `ready` -> `connected`.
   - normalização de URL: `https://zap.grupototum.com/` -> sem barra; valor com `/api` final -> detectar e remover (proposta).
C. Webhook inbound (handler com `adminClient` fake): payload `message.received` com `integration_id` -> insere mensagem; `session.status` ready -> `connected`; payload sem `sessionId` -> skipped; (após B6) token inválido -> rejeitado.
D. Staging E2E: um número real em tenant de teste: criar, QR aparece em <10 s, escanear, status vira `connected`, enviar texto, receber texto (checar `messages` e `config.webhook_registered=true`). Só então deploy.

Não verificado: formato real das respostas do OpenWA (campos qr/phone/status, regras de `name`), existência de Basic Auth no zap, valor atual dos secrets, versão realmente deployada.
