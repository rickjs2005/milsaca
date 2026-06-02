# Milsaca

> SaaS de corretagem de café que conecta **produtor**, **corretora** e **mercado** — cotações ao vivo, classificação COB (laudo), contratos, entregas e leads via WhatsApp.

Foco inicial: região de Manhuaçu / Matas de Minas (MG), com arquitetura pronta pra escala nacional. Multi-tenant, mobile-first pro produtor, web completo pra corretora e admin.

---

## Índice

- [Visão geral do produto](#visão-geral-do-produto)
- [Stack](#stack)
- [Estrutura do monorepo](#estrutura-do-monorepo)
- [Pré-requisitos](#pré-requisitos)
- [Setup (primeira vez)](#setup-primeira-vez)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Comandos do dia a dia](#comandos-do-dia-a-dia)
- [Arquitetura](#arquitetura)
- [Banco de dados & migrations](#banco-de-dados--migrations)
- [Convenções de código](#convenções-de-código)
- [Fluxo de contribuição](#fluxo-de-contribuição)
- [Deploy](#deploy)
- [Armadilhas conhecidas (leia antes de debugar)](#armadilhas-conhecidas-leia-antes-de-debugar)
- [Segurança](#segurança)
- [Mapa da documentação](#mapa-da-documentação)

---

## Visão geral do produto

Três personas:

| Persona | Onde usa | O que faz |
| --- | --- | --- |
| **Produtor** | Web (`/painel/produtor`) + Mobile (Expo) | Vê cotações, negociações, contratos, entregas, laudos; favorita e **avalia** corretoras; fala com a corretora por WhatsApp |
| **Corretora** | Web (`/painel/corretora`) | CRM de produtores, leads (pipeline + WhatsApp), lotes + **laudo COB**, contratos, entregas, compradores, cotações, analytics |
| **Admin** (plataforma) | Web (`/admin`) | Aprova corretoras, gerencia planos/assinaturas, configurações, auditoria, métricas |

Conceitos de domínio que todo dev precisa conhecer:

- **Classificação COB** (Instrução Normativa MAPA 8/2003) — laudo de qualidade do café cru. Implementação pura no pacote `@milsaca/cob` (tabela de tipos, defeitos, peneiras, bebida, "Fora de Tipo", PVA). Laudo tem PDF + QR + página pública.
- **Cotações** — indicadores ao vivo: CEPEA (scraping), ICE NY Coffee C, PTAX (BCB), via edge function `sync-cotacoes` (cron). Corretora também cadastra cotação manual.
- **Leads / WhatsApp** — pipeline de leads + tracking de clique no WhatsApp com mensagem enriquecida (funil clique→contrato).
- **Página pública da corretora** (`/c/[slug]`) — vitrine com especialidades, regiões de atuação, números reais e avaliações (estrelas).
- **EUDR / rastreabilidade** (futuro) — regulação UE com prazo dez/2026; exige polígono + DDS. PostGIS ainda não habilitado.

---

## Stack

- **Monorepo:** Turborepo 2.9 + pnpm workspaces
- **Web:** Next.js 16 (App Router, Turbopack) + React 19 + Tailwind **v3.4.17** (NÃO v4) + shadcn/ui (`shadcn@latest`)
- **Mobile:** Expo SDK 54 + Expo Router + NativeWind v4 + Tailwind v3.4.17
- **Banco/Auth:** Supabase (Postgres 17 + RLS + Realtime) — `@supabase/ssr` no web, `@supabase/supabase-js` no mobile
- **Chaves Supabase:** `sb_publishable_*` (client) / `sb_secret_*` (server) — **não** usar `anon`/`service_role` legacy
- **Outros:** `@react-pdf/renderer` + `qrcode` (laudo), Recharts (analytics), react-leaflet (mapa), Zod (validação), sonner (toasts), Sentry (erros)
- **Linguagem:** TypeScript estrito em tudo

> ⚠️ Tailwind é **v3.4.17** em todo lugar. Não atualizar pra v4. Não usar `@supabase/auth-helpers-nextjs` nem o pacote antigo `shadcn-ui`.

---

## Estrutura do monorepo

```
milsaca/
├── apps/
│   ├── web/                  # Next.js 16 — admin + corretora + produtor (operação completa)
│   │   ├── src/app/
│   │   │   ├── (root)        # home pública, cadastro/login, recuperação, /laudos, /c/[slug]
│   │   │   ├── admin/        # painel da plataforma (aprovação, planos, config, auditoria)
│   │   │   ├── onboarding/   # wizards de corretora e produtor
│   │   │   ├── painel/
│   │   │   │   ├── corretora/ # CRM, leads, lotes/COB, contratos, entregas, analytics
│   │   │   │   └── produtor/  # cotações, negociações, contratos, entregas, laudos, corretoras
│   │   │   └── api/          # rotas (ex.: /api/leads/whatsapp)
│   │   ├── scripts/          # CLI Node (seed, smokes) — usam service_role, só local
│   │   └── .env.example      # copie pra .env.local
│   └── mobile/               # Expo SDK 54 — produtor (tabs + atalhos)
├── packages/
│   ├── types/                # tipos TS compartilhados + database.ts (gerado do Supabase)
│   ├── db/                   # clients Supabase: web/server (cookie), web/public (anon, p/ unstable_cache), mobile
│   ├── ui/                   # componentes compartilhados
│   ├── cob/                  # @milsaca/cob — calculadora pura da IN 8/2003 (sem deps de runtime)
│   ├── config-tailwind/      # tokens de design Milsaca (cores, tipografia, sombras)
│   ├── eslint-config/        # ESLint base
│   └── typescript-config/    # tsconfig base
├── supabase/
│   ├── migrations/           # migrations SQL (ver convenção em docs/milsaca/convencao-migrations.md)
│   └── functions/            # edge functions (sync-cotacoes, send-dispatch)
├── docs/                     # documentação técnica versionada (ver "Mapa da documentação")
├── CLAUDE.md                 # convenções canônicas (design tokens, regras) — leitura obrigatória
└── README.md                 # este arquivo
```

---

## Pré-requisitos

| Ferramenta | Versão | Notas |
| --- | --- | --- |
| **Node** | 22.12+ (recomendado 24 LTS) | Projeto roda em 24.15.0 |
| **pnpm** | 10+ | `corepack enable` resolve a versão |
| **Docker Desktop** | opcional | só pra Supabase **local** (`pnpm db:start`). O time usa o Supabase **remoto** no dia a dia |
| **Supabase CLI** | via `npx`/`pnpm dlx` | `pnpm dlx supabase@latest <cmd>` |

---

## Setup (primeira vez)

```bash
# 1. Instalar dependências (na raiz do monorepo)
pnpm install

# 2. Configurar env do web (e do mobile, se for mexer no app)
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local
# Preencha com as chaves do Supabase (peça ao mantenedor — ver tabela abaixo)

# 3. Rodar o web
pnpm dev:web        # http://localhost:3000
```

> **Importante (Windows):** sempre rode os comandos a partir da **raiz** do monorepo (onde está o `package.json` raiz). `pnpm dev:web` é um script da raiz; rodá-lo de dentro de `apps/web/` falha com "dev:web not found".

---

## Variáveis de ambiente

Cada app lê do **próprio** `.env.local` (não da raiz). Nunca versione `.env.local` (o `.gitignore` já cobre, e há um hook de pre-commit que bloqueia).

**`apps/web/.env.local`:**

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | ✅ | URL do site (dev: `http://localhost:3000`) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | Chave `sb_publishable_*` — vai pro client, limitada por RLS |
| `SUPABASE_SECRET_KEY` | ⚠️ scripts | Chave `sb_secret_*` — **só servidor/CLI**, bypassa RLS. Nunca no client |
| `NEXT_PUBLIC_WHATSAPP_CONTATO` | opcional | número (DDI 55, só dígitos) do CTA público |
| `LEAD_IP_SALT` | opcional | salt p/ hashear IP em leads (LGPD). Gere: `openssl rand -hex 32` |
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_AUTH_TOKEN` | opcional | observabilidade (DSN é público; token é só build) |

**`apps/mobile/.env.local`:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (só vars `EXPO_PUBLIC_` vão pro bundle — nada secreto).

Detalhes e como obter cada chave: `apps/web/.env.example`.

---

## Comandos do dia a dia

```bash
# Desenvolvimento
pnpm dev              # web + mobile
pnpm dev:web          # só web (localhost:3000)
pnpm dev:mobile       # só mobile (Expo)

# Qualidade (rode antes de commitar)
pnpm type-check       # tsc --noEmit em todos os packages
pnpm lint             # ESLint
pnpm format           # Prettier --write

# Banco — Supabase LOCAL (requer Docker)
pnpm db:start
pnpm db:reset         # aplica migrations + seed
pnpm db:migration <nome>
pnpm db:types         # gera packages/types/src/database.ts do banco local
pnpm db:types:remote  # gera do projeto remoto (precisa supabase link)

# Filtrar por package
pnpm --filter @milsaca/web build
```

---

## Arquitetura

### Multi-tenant, roles e RLS

- **Isolamento por `corretora_id`** + **RLS habilitada em TODA tabela `public`** (sem exceção).
- Roles (`profiles.roles user_role[]`): `produtor`, `corretora`, `admin`. **Multi-role** — o mesmo email pode ser produtor + corretora; `/painel/escolher` aparece quando há 2+ papéis (cookie `mp_active_role`).
- **Admin** vive em tabela separada `app_admins` (não no enum). Helpers SQL: `is_admin()` / `is_app_admin()`, `current_corretora()`, `current_role()`.
- Trigger `handle_new_user()` cria o `profile` no signup (e blinda `role='admin'`).
- **Views públicas** (ex.: `corretoras_publicas`, `lotes_publicos`) rodam com `security_invoker=off` de propósito: expõem só colunas/agregados não-sensíveis pra anônimo, sem furar a RLS das tabelas de baixo.

### Auth

- **Email + senha** pra todos (produtor e corretora). **Não** usar magic link (o Gmail Safe Links faz prefetch e queima o link one-time).
- No **servidor**, usar `getUser()` — **nunca** `getSession()`.
- Middleware protege `/admin` e `/painel`. Após login, redireciona pro painel correto (nunca deixa preso no login).

### Padrão de Server Actions (web)

Toda mutation segue o mesmo esqueleto:

1. `requireUser()` / `requireAppAdmin()` / `getProfile()` no início
2. Validação **Zod** (`safeParse` + `flattenZodErrors`) — schemas em `_lib/schemas.ts`
3. Operação no Supabase
4. `audit_log.insert` quando aplicável
5. `friendlyPostgresError` antes de redirecionar (não vazar erro cru)
6. `revalidatePath(...)` (e `revalidatePath('/c/<slug>')` quando muda dado público)

### Camadas de client Supabase (`@milsaca/db`)

- `web/server` — usa `cookies()` (sessão do usuário). Torna a rota dinâmica.
- `web/public` — **sem cookie**, só publishable key. Use dentro de `unstable_cache` (cache não pode tocar APIs dinâmicas).
- `mobile` — `@supabase/supabase-js` + `expo-secure-store`.

---

## Banco de dados & migrations

> ⚠️ **O remoto está dessincronizado das migrations locais (drift conhecido).** `supabase db push` é **inseguro**. O fluxo do time é aplicar migrations **idempotentes via MCP `apply_migration`** no projeto remoto. Ao gerar/alterar schema, **regenere os types** (`packages/types/src/database.ts`) — preferencialmente via MCP (o `supabase gen types` da CLI injeta lixo no Windows que quebra o type-check até limpar).

- Convenção de nome e estrutura: `docs/milsaca/convencao-migrations.md`.
- RLS é obrigatória em toda tabela nova. Rode o advisor de segurança do Supabase após DDL.

---

## Convenções de código

- **Código e schema em inglês:** `profiles`, `corretora_id`, `leads`, `contratos`, `created_at`.
- **UI, textos e comentários úteis em pt-BR.**
- **Design tokens** (cores, tipografia, sombras, radius) em `packages/config-tailwind/tokens.js` — use as keys da marca (`milsaca-cafezal`, `milsaca-dourado`, `neutral-*` em vez de `slate-*`, `success/warning/danger/info`, `text-h1`/`text-body`...). **Detalhes e regras de contraste no `CLAUDE.md`.**
- Pacotes: `@milsaca/web`, `@milsaca/mobile`, `@milsaca/types`, `@milsaca/db`, `@milsaca/ui`, `@milsaca/cob`, `@milsaca/config-tailwind`.

---

## Fluxo de contribuição

1. Crie um branch a partir de `main`.
2. Faça a mudança. Rode `pnpm type-check` e `pnpm lint` (devem passar).
3. Commit — há um **hook de pre-commit local** que bloqueia `.env` e padrões de segredo (chaves Supabase, JWTs, etc.). Ele é local a cada clone (`.git/hooks/pre-commit`); replique ao clonar.
4. Abra PR pra `main`. O CI roda lint + type-check.

> Mensagens de commit e PRs em pt-BR seguem o padrão do histórico (`feat:`, `fix:`, `chore:`...).

---

## Deploy

- **Web → Vercel:** `docs/milsaca/deploy-vercel.md`
- **Mobile → EAS:** `docs/milsaca/deploy-mobile-eas.md`
- **CI/CD:** `docs/milsaca/deploy-cd.md`
- **Observabilidade (Sentry/PostHog):** `docs/milsaca/observabilidade-sentry-posthog.md`
- **Backup/retenção:** `docs/milsaca/backup-retencao.md`
- **Smoke test de produção:** `docs/milsaca/checklist-smoke-producao.md`

Edge functions (cotações, dispatch) são deployadas via Supabase CLI; secrets via `supabase secrets set`.

---

## Armadilhas conhecidas (leia antes de debugar)

| Sintoma | Causa / Solução |
| --- | --- |
| Acento vira `caf�` no banco/arquivo | Windows PowerShell 5.1 grava **Latin-1**, não UTF-8. Use `-Encoding utf8` ao escrever arquivos; insira texto com acento via app/SQL Editor, nunca por script PS ad-hoc. Antes de demo, varra `position(E'�' in col) > 0`. |
| Edição no admin "não salva" | A action revalida **todos** os campos no submit. Um campo inválido pré-existente (ex.: CNPJ com dígito verificador errado vindo de seed) trava toda edição. Garanta dado válido na entrada. |
| Mudança não aparece em `/c/[slug]` | A página usa `unstable_cache` (TTL curto) + `revalidatePath` na edição via app. Mudança feita **direto no SQL** não invalida — só via app ou `rm -rf apps/web/.next` + restart. |
| `revalidateTag` não compila | No Next 16 a assinatura mudou (`revalidateTag(tag, profile)`). Pra `unstable_cache` legado, prefira `revalidatePath` + TTL curto. |
| `supabase gen types` quebra o type-check | A CLI injeta texto de login no início + `<claude-code-hint />` no fim. Limpe, ou regenere via MCP. |
| `pnpm dev:web` "não encontrado" | Você está dentro de `apps/web/`. Rode da **raiz** do monorepo. |

---

## Segurança

- **A RLS é a única muralha dos dados** — a publishable key é pública por design (vai no client). Toda tabela nova precisa de RLS correta; rode o advisor do Supabase após DDL.
- **Nunca** comitar `.env.local` nem a chave `sb_secret_*`/service_role. O hook de pre-commit bloqueia, mas a disciplina vem primeiro.
- Repositório é **privado**. Secret scanning nativo do GitHub não está disponível em repo privado no plano free — por isso o hook local cobre essa frente.

---

## Mapa da documentação

Tudo versionado **no repo** (acessível a quem tem o código):

- **[`CONTRIBUTING.md`](CONTRIBUTING.md)** — processo de contribuição: fluxo, padrões, receitas (migration, server action, tela), testes, commits/PR, Definition of Done.
- **[`docs/ARQUITETURA.md`](docs/ARQUITETURA.md)** — como o sistema funciona por dentro: camadas, modelo de dados (38 tabelas), RLS multi-tenant, auth, cache, domínio do café, edge functions/cron.
- **`CLAUDE.md`** — convenções canônicas: stack obrigatória, design tokens completos, regras de auth, o que NÃO fazer. **Leitura obrigatória.**
- `docs/README-MILSACA.md` — resumo do projeto
- `docs/milsaca/convencao-migrations.md` — como criar migrations
- `docs/milsaca/deploy-*.md` — Vercel, EAS, CI/CD
- `docs/milsaca/observabilidade-sentry-posthog.md`, `backup-retencao.md`, `checklist-smoke-producao.md`
- `docs/milsaca/gaps-produto-por-persona.md` — lacunas de produto por persona
- `docs/milsaca/auditoria-responsividade.md` — auditoria de responsividade
