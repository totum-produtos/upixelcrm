# CLAUDE.md — uPixel CRM

**Versão:** 3.1
**Atualizado:** 2026-11-07
**Nível:** [ ] LP/Site  [ ] MVP  [ ] Teste  [x] Produção
**Sistema:** Vibe Coding Totum v3.0

---

## PERGUNTA-GATILHO (obrigatória antes de qualquer implementação)

> **Este é um projeto de PRODUÇÃO.**  
> Toda feature nova passa por: Revisão Pré-Produção → Raio-X → Teste → Deploy

---

## CONTEXTO DO PROJETO

**Nome:** uPixel CRM
**Descrição curta:** CRM SaaS multi-tenant por subdomínio para gestão de vendas e atendimento.
**Problema que resolve:** Empresas precisam de um CRM simples, rápido e com isolamento de dados por cliente.
**Usuário principal:** Gestores comerciais, vendedores e equipes de atendimento de pequenas e médias empresas.

---

## STACK

| Camada | Tecnologia |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| UI Components | shadcn/ui (Radix UI primitives + Tailwind) |
| Backend / BaaS | Supabase |
| Autenticação | Supabase Auth |
| Banco de dados | PostgreSQL via Supabase |
| Roteamento | React Router DOM v6 |
| Estado & Dados | TanStack Query (React Query) |
| Formulários | React Hook Form + Zod |
| Gráficos | Recharts |
| Diagramas | React Flow |
| Drag & Drop | @dnd-kit |
| Testes | Vitest + Playwright + Testing Library |
| Deploy | Vercel (frontend, preview por PR) + GitHub Actions (edge functions) |
| Versionamento | GitHub |

---

## ESTRUTURA DE PASTAS

```
src/
├── assets/        [imagens, ícones, fontes]
├── components/    [componentes reutilizáveis (shadcn/ui + custom)]
├── contexts/      [React contexts (auth, tenant, etc.)]
├── hooks/         [hooks customizados]
├── integrations/  [integrações externas (WhatsApp, etc.)]
├── lib/           [funções utilitárias, config Supabase]
├── modules/       [módulos de negócio]
├── pages/         [páginas/rotas da aplicação]
└── main.tsx       [entry point]
```

---

## COMANDOS ÚTEIS

```bash
npm run dev         # rodar em desenvolvimento (Vite)
npm run build       # build de produção
npm run build:dev   # build modo development
npm run lint        # verificar lint (ESLint)
npm run typecheck   # tsc strict (0 erros exigido no CI)
npm run test        # rodar testes (Vitest)
npm run test:watch  # rodar testes em watch mode
npm run test:coverage # testes + cobertura (lib/services/hooks)
npm run test:e2e    # E2E Playwright sem backend (local: E2E_CHROMIUM_PATH=/opt/pw-browsers/chromium)
npm run preview     # preview do build
```

---

## PADRÕES DE CÓDIGO

- TypeScript strict mode ativado
- Componentes: PascalCase (ex: `UserCard.tsx`)
- Funções e hooks: camelCase (ex: `useUserData`)
- Constantes: UPPER_SNAKE_CASE
- Arquivos de serviço: kebab-case
- Um componente por arquivo
- Props sempre tipadas com interface
- Hooks customizados: prefixo `use`
- Utilitários: funções puras, export nomeado

---

## REGRAS DE COMPORTAMENTO

Antes de qualquer mudança:
1. Explique o plano em 2-3 linhas
2. Liste os arquivos que serão afetados
3. Aguarde confirmação se a mudança for em área sensível (RLS, auth, tenant)
4. Implemente uma mudança por prompt
5. Liste como testar ao final
6. Sugira o commit

---

## ÁREAS SENSÍVEIS — NÃO ALTERAR SEM AVISO EXPLÍCITO

```
[x] Autenticação: src/contexts/auth, lib/supabase auth, Supabase Auth config
[x] Banco de dados: RLS policies, tenant_id isolamento, Supabase migrations
[x] Pagamentos: N/A (ainda)
[x] Permissões e roles: RLS policies, tenant-based access
[x] Integrações críticas: WhatsApp integration, Supabase realtime
[x] Variáveis de ambiente: .env, .env.production (nunca expor)
```

---

## NO-FLY ZONES

A IA **não decide sozinha** sobre:
- Segurança e criptografia
- Autenticação e autorização
- Pagamentos
- Schema de banco em produção
- Exclusão de dados
- Multi-tenancy (RLS, tenant_id, isolamento)
- Deploy em produção

Regra: **IA sugere. Humano aprova.**

---

## ESTADO ATUAL DO PROJETO

**Fase atual:** Produção
**Últimas mudanças:** Adequação BuildOps (POP-014-B), ver `docs/dev/PLANO-ADEQUACAO-BUILDOPS.md`
**Ficha do projeto:** `PROJECT_CARD.md`
**Decisões:** `docs/decisions/` (ADR-UPX-001 a 006)
**Próximas tarefas:** Ver TODO.md
**Bugs conhecidos:** Ver BUGS.md

### Saúde Técnica (medida em 2026-11-07, fim da noite)

| Verificação | Status | Detalhe |
|---|---|---|
| Build | ✅ OK | `npm run build` passa |
| Lint | ⚠️ 479 warnings | 0 erros (maioria `no-explicit-any`) |
| TypeScript | ✅ OK | `npm run typecheck` com 0 erros |
| Testes | ✅ OK | 611/611 (`npm run test`) |
| Cobertura | 🟡 45% | linhas em lib/services/hooks, threshold impede queda (`npm run test:coverage`) |
| E2E | ✅ 22 testes | sem backend (`npm run test:e2e`); telas logadas dependem de staging |
| CI em PR | ✅ OK | `.github/workflows/pr-ci.yml` (lint, typecheck, testes, cobertura, build, E2E) |
| .env no .gitignore | ✅ OK | .env, .env.local, .env.migration protegidos |

---

## LINKS E REFERÊNCIAS

| Recurso | Link |
|---|---|
| Repositório | https://github.com/totum-produtos/upixelcrm |
| Deploy | [URL produção — preencher] |
| Supabase | [URL projeto Supabase — preencher] |
| Design | [URL Figma ou N/A] |

---

## ARQUITETURA MULTI-TENANT

### Princípio
Cada cliente acessa via subdomínio: `cliente.upixel.com.br`
Isolamento via RLS no Supabase usando `tenant_id`.

### Fluxo de onboarding
1. Cliente acessa domínio raiz (`upixel.com.br`)
2. Preenche nome, subdomínio desejado, e-mail e senha
3. Sistema cria tenant e usuário automaticamente
4. Redirecionamento para `{subdomain}.upixel.com.br`

---

## VARIÁVEIS DE AMBIENTE

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_ROOT_DOMAIN=localhost  # ou upixel.com.br em prod
```

---

## TESTE DE SUBDOMÍNIOS LOCALMENTE

Editar `/etc/hosts`:
```
127.0.0.1  localhost
127.0.0.1  acme.localhost
127.0.0.1  demo.localhost
```

---

## SKILLS E FERRAMENTAS

| Situação | Usar |
|---|---|
| Revisão antes de deploy | `skill-revisao-pre-producao.md` |
| Auditoria de limpeza | `skill-raio-x.md` |
| Debug de bug difícil | `skill-debug-profundo.md` |
| Eliminar código repetido | `skill-refatorador-dry.md` |
| Antes de commitar | `skill-revisor-commit.md` |
| Criar componente React | `skill-criador-componente.md` |
| Gerar testes | `skill-gerador-testes.md` |
| Revisar segurança | `skill-review-segurança.md` |

> Skills vêm do plugin `totum-skills@totum-house` (repo totum-house/skills), habilitado em `.claude/settings.json`. Orquestração: `/totum-buildops-orchestrator`.

---

## REGRAS QUE NUNCA MUDAM (Totum Torah)

1. Sempre perguntar: **LP/Site | MVP | Teste | Produção?**
2. **Uma mudança por prompt**
3. **Testar antes de commitar**
4. **Documentar antes de mexer**
5. **IA sugere. Humano aprova** (em No-Fly Zones)
6. **Preservar o que funciona**
7. Prioridade: **Confiabilidade → Velocidade → Performance**

---

*CLAUDE.md v3.1, uPixel CRM, Sistema Vibe Coding Totum, 2026-11-07*
