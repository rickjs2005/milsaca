# Milsaca — Resumo da documentação

> A documentação completa fica no vault Obsidian em `C:\Users\rickj\saas\_Milsaca\`.
> _(Nome com underscore para não colidir com a pasta de código `milsaca/` — Windows é case-insensitive.)_

## Mapa

| # | Documento | Resumo |
| --- | --- | --- |
| 00 | [Dashboard](../../_Milsaca/00 - Dashboard.md) | Status atual, última entrega, próximos passos, riscos |
| 01 | [Roadmap](../../_Milsaca/01 - Roadmap.md) | Plano de 14 dias, sprints, prioridades |
| 02 | [Stack Técnica](../../_Milsaca/02 - Stack Tecnica.md) | Versões, decisões, deprecated |
| 03 | [Estrutura do Monorepo](../../_Milsaca/03 - Estrutura do Monorepo.md) | Árvore de pastas, packages, dependências |
| 04 | [Supabase e Banco](../../_Milsaca/04 - Supabase e Banco.md) | Tabelas, RLS, triggers, comandos |
| 05 | [Auth e Fluxos](../../_Milsaca/05 - Auth e Fluxos.md) | Magic link / email+senha / callback / logout |
| 06 | [Comandos](../../_Milsaca/06 - Comandos.md) | Cheat sheet de pnpm/Supabase/Expo/git |
| 07 | [Pendências](../../_Milsaca/07 - Pendencias.md) | Bloqueios, ferramentas, decisões pendentes |

## Quick start

```powershell
cd C:\Users\rickj\saas\milsaca
pnpm install
Copy-Item .env.example .env.local
# preencher .env.local com chaves do Supabase
pnpm dev:web   # http://localhost:3000
```
