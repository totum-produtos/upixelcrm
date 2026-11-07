# Handoff BuildOps, 2026-11-07

**Para:** Rael
**Plano de referência:** `docs/dev/PLANO-ADEQUACAO-BUILDOPS.md` (POP-014-B)
**PR:** totum-produtos/upixelcrm#122
**Execução:** Opus 5.5 orquestrando, subagentes Sonnet 5.5 (tsc, ADRs, TODO/BUGS) e Haiku 5.5 (faxina de docs). Tudo revisado pelo orquestrador antes do commit.

---

## 1. Placar

| Indicador | Antes (manhã) | Agora | Meta do plano |
|---|---|---|---|
| Erros de `tsc` | 8 | **0** | 0 ✅ |
| Testes falhando | 5 de 93 | **0 de 94** | 0 ✅ |
| CI em PR | não existia | **ativa** (`pr-ci.yml`, 1min46s) | sim ✅ |
| Cobertura (lib/services/hooks) | não medida | **4,33%** das linhas | medida ✅ |
| `.md` soltos na raiz | 29 | **7** | ≤ 6 (quase) |
| ADRs | 0 | **6** | 6 ✅ |
| PROJECT_CARD | não existia | **criado** (com lacunas, ver seção 4) | ✅ |
| Warnings de lint | 509 | 509 | não piorar ✅ |

**Fase 1: concluída**, faltando só a branch protection, que é com você.
**Fase 2: concluída**, faltando o item 2.3 (destino dos `.sql` e das pastas soltas) e o 2.6 (graphify), ver seção 4.

---

## 2. O que foi feito, commit por commit

| Commit | O que muda | Risco |
|---|---|---|
| `test(cb-01)` | O teste chamava `getAccessState`, que **nunca existiu**. Foi reescrito contra `evaluateProfileAccess`, a função real usada pelo AuthContext. Ganhou também um caso novo (master pendente). **Nenhuma linha de auth mudou.** | Baixo. Só o teste mudou, mas é área sensível, então vale você olhar |
| `fix(dashboard)` | O nome das etapas no card de pipeline e o texto da atividade recente **apareciam vazios em produção**. A página lia `stage.stage` e `activity.description`, e a RPC devolve `name` e `content`. Também corrige o tipo no PreferencesPanel (a lógica não mudou). | Baixo. É a única mudança visível pro usuário |
| `ci` | `pr-ci.yml` novo, que roda lint, typecheck, testes com cobertura e build em todo PR. O `deploy.yml` também ganhou typecheck. Scripts novos: `npm run typecheck` e `npm run test:coverage`. | Nenhum em runtime |
| `docs(adr)` | ADR-UPX-001 a 006 em `docs/decisions/` e `PROJECT_CARD.md` | Nenhum |
| `docs: reconcilia` | TODO.md e BUGS.md conferidos contra o código atual, cada item com evidência | Nenhum |
| `docs: organiza` | 23 `.md` movidos da raiz para `docs/history`, `docs/dev` e `docs/dev/issues` com `git mv`, o que preserva o histórico. CLAUDE.md atualizado com números reais | Nenhum |

Uma correção minha sobre o trabalho dos subagentes: o agente da faxina tinha editado um comentário dentro de `supabase/migrations-pending/`. **Reverti**, porque `supabase/` é No-Fly Zone.

---

## 3. O que a auditoria revelou e você precisa saber

### Segurança (ABERTO, do BUGS.md reconciliado)
1. **SEC-1: o push de mensagem nova provavelmente nunca é enviado.** O `send-push` valida o chamador com `auth.getUser()`, mas os webhooks de WhatsApp e Instagram chamam com a service role, e a falha não gera log. Evidência: `supabase/functions/send-push/index.ts:75-92`.
2. **SEC-2: vazamento entre tenants.** O `whatsapp-status-probe` não confere o tenant de quem chama. Qualquer usuário logado de qualquer tenant que saiba o UUID de uma integração consegue ler o status dela. Evidência: `supabase/functions/whatsapp-status-probe/index.ts:19-48`.
3. **BUG-024: regressão.** O botão "Excluir" no detalhe do lead apaga sem pedir confirmação (`src/components/crm/LeadDetail.tsx:1060-1064`). Ele estava marcado como resolvido, mas um refactor reabriu o problema.
4. **cb-07 sumiu.** A série vai de cb-01 a cb-10, mas o cb-07 não aparece em nenhum commit nem documento.

Os itens 1 e 2 são em edge functions (área de auth/tenant), por isso **não corrigi**. Esperam o seu OK.

### Qualidade
- **A cobertura é de 4,33%, não "baixa"**. Por isso o ratchet da Fase 3 foi ajustado para 10% → 25% → 50% → 80%. Começar exigindo 40% travaria todo PR.
- A meta de E2E continua em zero. O Playwright está instalado, mas a config é um template do Lovable.
- `AppContext.tsx` tem 1184 linhas e baixa **todos os leads** em páginas de 1000 ao abrir o app (`src/contexts/AppContext.tsx:150-262`). É o maior risco de performance com cliente grande.

---

## 4. O que ficou pra você (em ordem de urgência)

### Precisa de você, 5 minutos
1. **Revisar e mergear o PR totum-produtos/upixelcrm#122.** Você autorizou o merge e eu vou fazer, mas lembre que merge na `main` = deploy em produção na Vercel.
2. **Ligar a branch protection** em `main`: GitHub → Settings → Branches → Add rule → `main` → "Require status checks" → marcar `quality-gate`. Sem isso o gate avisa, mas não bloqueia.
3. **Conferir o Dashboard em produção** depois do deploy: o card de pipeline deve mostrar os nomes das etapas.

### Decisões que só você toma
4. **OK pra corrigir SEC-1 e SEC-2?** São edge functions com auth/tenant. Eu preparo o diff e você aprova antes do push.
5. **Item 2.3:** o que fazer com os 3 `.sql` da raiz (`SUPABASE_*.sql`), com `supabase/migrations-pending/` e com as pastas `tmp/`, `audit/`, `CRM SALES/`, `Copywriter/`, `Prompts/`, `Revisão - Julho/`, `Deisgn System/`: arquivar, mover pra `docs/internal/` ou apagar? Pode ter credencial em `.sql`, então isso passa pelo Sentinela.
6. **Onde ficam os POP-014 A-E e os ADRs D-XXX?** A skill `totum-buildops-orchestrator` cita esses arquivos, mas eles não existem no `totum-house/skills`. Por enquanto usei numeração local (ADR-UPX-xxx).
7. **Board de tasks:** Linear, GitHub Issues ou Markdown? Até você decidir, ficou em Markdown (TODO.md e BUGS.md).

### Dados que faltam no PROJECT_CARD (marcados "A CONFIRMAR")
8. URL de produção e domínio raiz. Há conflito no repo: o README fala em `upixel.com.br` e o `docs/CLOUDFLARE_PAGES.md` em `upixel.app`.
9. Se existe Supabase de staging. Hoje o preview parece usar o banco de produção, o que é um risco para os E2E da Fase 3.
10. Papel do Kleber, responsável por incidentes, SLA do produto.

### Não feito por limitação técnica
- **2.6 Graphify:** a CLI `graphify` não está instalada neste ambiente. Fica pra uma sessão onde ela exista.

---

## 5. Próximo passo sugerido (Fase 3)

Quando você der OK, sigo com:
1. Threshold de cobertura em 4% (ratchet: só pode subir).
2. Testes dos 6 repositórios em `src/services/`, cada um com um subagente Sonnet em paralelo. Isso deve levar a cobertura para perto de 10% em uma sessão.
3. Config real do Playwright com 5 fluxos críticos rodando contra o preview. **Depende da resposta do item 9** (banco de staging), porque E2E contra o banco de produção cria lixo nos dados reais.

Custo estimado da Fase 3 com essa divisão de modelos: a maior parte em Sonnet, com Opus só na revisão. É hipótese, não medição.
