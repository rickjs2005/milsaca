# Milsaca

> Corretagem de café que conecta produtor, corretora e mercado.

SaaS B2B/B2C para corretoras e produtores de café, com foco no Sul de Minas e em escala nacional.

## Stack

- **Monorepo:** Turborepo 2.9 + pnpm workspaces
- **Web:** Next.js 16 (App Router) + Tailwind v3.4.17 + shadcn/ui
- **Mobile:** Expo SDK 54 + Expo Router + NativeWind v4 + Tailwind v3.4.17
- **Banco/Auth:** Supabase (Postgres + RLS) com chaves `sb_publishable_*` / `sb_secret_*`
- **Linguagem:** TypeScript em tudo

## Estrutura

```
milsaca/
├── apps/
│   ├── web/        # Next.js 16 — corretora e produtor (futuro)
│   └── mobile/     # Expo SDK 54 — produtor primeiro
├── packages/
│   ├── types/              # Tipos TS compartilhados + database.ts (Supabase)
│   ├── db/                 # Clients Supabase (web/mobile)
│   ├── ui/                 # Componentes RN + Web compartilhados
│   ├── config-tailwind/    # Tokens Milsaca (cores, fontes)
│   ├── eslint-config/      # ESLint base
│   └── typescript-config/  # tsconfig base
├── supabase/               # Migrations, config.toml, seed
└── docs/                   # Resumo da documentação (full em Obsidian)
```

## Pré-requisitos

| Ferramenta | Versão atual | Versão alvo |
| --- | --- | --- |
| Node | 22.12.0 | 24 LTS (pendência) |
| pnpm | 10.33.4 | 11 (pendência) |
| Docker Desktop | — | obrigatório p/ Supabase local |
| Supabase CLI | via `npx` | — |

## Comandos

```bash
# Setup
pnpm install

# Desenvolvimento
pnpm dev              # tudo
pnpm dev:web          # só web
pnpm dev:mobile       # só mobile

# Qualidade
pnpm lint
pnpm type-check
pnpm format

# Banco (requer Docker + Supabase CLI)
pnpm db:start
pnpm db:stop
pnpm db:reset
pnpm db:migration nome_da_migration
pnpm db:types         # tipos do banco local
pnpm db:types:remote  # tipos do projeto Supabase remoto
```

## Convenções

- **Código e schema do banco em inglês** (`profiles`, `corretora_id`, `leads`, `contratos`).
- **UI, textos e documentação em pt-BR.**
- **Multi-tenant** por `corretora_id` + RLS em todas as tabelas `public`.
- **Auth:** produtor entra com magic link, corretora com email + senha.

## Documentação completa

Toda a documentação extensa vive no vault Obsidian em `../Milsaca/`:

- `00 - Dashboard.md`
- `01 - Roadmap.md`
- `02 - Stack Tecnica.md`
- `03 - Estrutura do Monorepo.md`
- `04 - Supabase e Banco.md`
- `05 - Auth e Fluxos.md`
- `06 - Comandos.md`
- `07 - Pendencias.md`

Resumo aqui em `docs/README-MILSACA.md`.
