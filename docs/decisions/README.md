# Decisões de Arquitetura (ADRs) do uPixel CRM

Registro das decisões técnicas do projeto. Numeração local `ADR-UPX-NNN` (ver `docs/dev/PLANO-ADEQUACAO-BUILDOPS.md`, seção 2). Se os POP-014 e os ADRs D-XXX da Totum forem localizados em outro repositório, a numeração será alinhada.

## Índice

| ID | Título | Status | Arquivo |
|---|---|---|---|
| ADR-UPX-001 | Stack canônica | Aceita | [ADR-UPX-001-stack-canonica.md](ADR-UPX-001-stack-canonica.md) |
| ADR-UPX-002 | Multi-tenant por subdomínio com RLS | Aceita | [ADR-UPX-002-multitenant-rls.md](ADR-UPX-002-multitenant-rls.md) |
| ADR-UPX-003 | Credenciais fora do repositório e do bundle | Aceita | [ADR-UPX-003-credenciais-fora-do-repo.md](ADR-UPX-003-credenciais-fora-do-repo.md) |
| ADR-UPX-004 | Camadas: services, hooks, pages | Aceita | [ADR-UPX-004-camadas-services-hooks-pages.md](ADR-UPX-004-camadas-services-hooks-pages.md) |
| ADR-UPX-005 | Quality Gate obrigatório em PR | Proposta | [ADR-UPX-005-quality-gate-em-pr.md](ADR-UPX-005-quality-gate-em-pr.md) |
| ADR-UPX-006 | Preview Vercel como ambiente canário | Proposta | [ADR-UPX-006-preview-vercel-canario.md](ADR-UPX-006-preview-vercel-canario.md) |

## Template

```markdown
# ADR-UPX-NNN: Título curto

**Status:** Proposta | Aceita | Substituída por ADR-UPX-XXX
**Data:** AAAA-MM-DD

## Contexto
O problema e as forças em jogo. Evidência real do repositório.

## Decisão
O que foi decidido, em frases diretas.

## Consequências
O que melhora, o que piora, o que fica pendente.

## Referências
Arquivos, commits e PRs.
```

## Regras

- Um ADR aceito não é editado para mudar a decisão. Cria-se um novo ADR e o antigo passa a "Substituída por".
- Decisão em área sensível (RLS, auth, tenant, deploy em produção) só vira "Aceita" com aprovação do Rael.
