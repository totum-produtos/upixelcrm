# Meta Ads: setup e handoff

Objetivo: permitir que cada tenant conecte a conta de anúncios do Meta em
`/campaigns` (aba Meta Ads) ou em `/meta-ads`, e sincronize campanhas.

Mesmo App Meta do WhatsApp/Instagram (`911162198384188`). Ver também
`docs/whatsapp-embedded-signup-setup.md`.

## O que o código já faz (PR desta branch)

- `/campaigns` → aba Meta Ads mostra o botão **Conectar Meta Ads via Facebook**
  direto (sem trocar de página) e um link para a conexão manual.
- Ao conectar, a página atualiza o status e dispara o primeiro sync.
- Aviso de token expirando (10 dias ou menos) com botão de reconectar.
- Edge functions param de mentir "sucesso": se o banco recusar a gravação,
  devolvem erro 500 com a mensagem real.
- Graph API do `meta-ads` alinhada em `v22.0` (igual ao resto).

## Checklist manual (o que só humano faz)

### 1. Meta Developers (app 911162198384188)
- [ ] **Facebook Login for Business → Configurations → Create configuration**
  - Tipo: *User access token*
  - Permissões: `ads_management`, `ads_read`, `business_management`
  - Copiar o **Configuration ID**
- [ ] **App settings → Basic → App Domains**: incluir `upixel.app` (e `totum.upixel.app` se exigido)
- [ ] **Facebook Login for Business → Settings → Allowed Domains for the JavaScript SDK**:
  incluir `https://totum.upixel.app` (e demais subdomínios de tenant em uso)
- [ ] **App Review**: `ads_management` e `ads_read` precisam de *Advanced Access*
  para contas de quem não tem papel no app. Sem isso, só admins/devs/testers do app conectam.
  Kit de submissão: `docs/meta-app-review-submission-kit.md`.

### 2. Frontend (build)
- [ ] Criar `VITE_META_ADS_CONFIG_ID` com o Configuration ID do passo 1:
  - no provedor que builda `totum.upixel.app` (Vercel: Production + Preview)
  - nos GitHub Secrets do repo (usado por `deploy.yml` e `pr-ci.yml`)
- [ ] Confirmar que `VITE_META_APP_ID` também está lá
- [ ] Redeploy do frontend (variável `VITE_` só entra no build)

### 3. Edge functions na VPS (Supabase self-hosted)
- [ ] Secrets `META_APP_ID` e `META_APP_SECRET` presentes no env das functions
  (auditoria H-019 indicava `META_APP_SECRET` ausente). Pedir ao Sentinela, não ler o vault direto.
- [ ] Publicar as functions alteradas (rsync, ver `deploy/selfhosted/README.md`):
  `meta-ads`, `meta-ads-exchange-token`, `google-ads`, `google-oauth`,
  `instagram-proxy` e a pasta `_shared` (arquivo novo `saveIntegration.ts`)
- [ ] Reiniciar o container de functions e olhar logs por alguns minutos

### 4. Banco (conferir, não alterar sem decisão)
```sql
-- tabela de cache das campanhas existe?
select to_regclass('public.ad_campaigns');
-- se null: a migration 20260424_ads_attribution.sql não rodou em produção.
-- Sem ela o sync agora retorna erro SYNC_PERSIST_FAILED (antes falhava calado).

select indexname from pg_indexes where tablename = 'integrations';
```
Aplicar migration em produção é No-Fly Zone: decisão do Rael.

## Como testar depois do deploy
1. Abrir `https://totum.upixel.app/campaigns` → aba **Meta Ads**.
2. Se aparecer "Conexão automática indisponível": faltou o passo 2.
3. Clicar em **Conectar Meta Ads via Facebook** → escolher a conta.
   - Erro 503 "Embedded Signup ainda não configurado": faltou o passo 3.
   - "Nenhuma conta de anúncio ativa": a conta do usuário está inativa no Business Manager.
4. Após conectar, o sync roda sozinho. Erro `Falha ao gravar campanhas`: faltou o passo 4.
5. Conexão manual (`/meta-ads`, token + ID da conta): agora mostra erro real se não salvar.

## Erros e causa provável
| Mensagem | Causa |
|---|---|
| Conexão automática indisponível | `VITE_META_APP_ID`/`VITE_META_ADS_CONFIG_ID` fora do build |
| Embedded Signup ainda não configurado | `META_APP_ID`/`META_APP_SECRET` ausentes nas functions |
| Falha ao trocar código | `META_APP_SECRET` errado, ou domínio não liberado no app |
| Popup fecha sem nada | domínio fora de *Allowed Domains for the JS SDK* |
| Falha ao salvar integração | erro do banco ao gravar `integrations` (mensagem vem junto) |
| Falha ao gravar campanhas | `ad_campaigns` ausente ou sem permissão |
| Token expirado | token de ~60 dias venceu: reconectar |
