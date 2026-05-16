# CLAUDE.md — Instruções para Claude Code no Milsaca

Este arquivo orienta sessões futuras do Claude Code que trabalharem neste monorepo.

## Identidade do projeto

**Milsaca** — SaaS de corretagem de café. Conecta produtor, corretora e mercado.

- **NÃO** confundir com o projeto **Kavita** (outro SaaS B2B do mesmo usuário, em pasta separada).
- Não usar nomes `kavita-corretora`, `kavita`, etc. dentro deste projeto.

## Stack obrigatória

- Turborepo 2.9 + pnpm workspaces
- Node 22+ (alvo Node 24 LTS)
- Next.js 16 (App Router) — web
- Expo SDK 54 + Expo Router — mobile
- Tailwind **v3.4.17** (NÃO v4) — web e mobile
- NativeWind v4 — mobile
- shadcn novo via `pnpm dlx shadcn@latest` (NÃO o pacote `shadcn-ui` antigo)
- Supabase + `@supabase/ssr` (NÃO `@supabase/auth-helpers-nextjs`)
- `@supabase/supabase-js` no mobile
- TypeScript estrito em tudo

## Convenções de nomenclatura

- **Código e schema de banco em inglês:** `profiles`, `corretoras`, `leads`, `contratos`, `corretora_id`, `created_at`.
- **UI, textos e comentários úteis em pt-BR.**
- Pacotes: `@milsaca/web`, `@milsaca/mobile`, `@milsaca/types`, `@milsaca/db`, `@milsaca/ui`, `@milsaca/config-tailwind`, `@milsaca/eslint-config`, `@milsaca/typescript-config`.

## Identidade visual

Paleta Milsaca:

| Token | Hex |
| --- | --- |
| `milsaca.verde` | `#2D3A2E` |
| `milsaca.verde-claro` | `#4A5C4C` |
| `milsaca.dourado` | `#C9A961` |
| `milsaca.dourado-claro` | `#E0C68A` |
| `milsaca.cream` | `#FAF7F0` |
| `milsaca.cream-escuro` | `#EFEADB` |

Fonte: **Inter** (via `next/font/google` no web, `@expo-google-fonts/inter` no mobile).

## Multi-tenant e segurança

- **Toda tabela em `public` precisa ter RLS habilitado.** Sem exceção.
- Isolamento por `corretora_id` + helpers `current_role()`, `current_corretora()`, `is_admin()`.
- Roles: `produtor`, `corretora`, `admin`.
- Trigger `handle_new_user()` cria `profile` no signup.

## Auth

- **OTP de 6 dígitos por email** pra todos (produtor e corretora). Magic link foi descartado porque o Gmail Safe Links faz prefetch e queima o link one-time-use. Ver `_Milsaca/05 - Auth e Fluxos.md` e a memória `feedback_supabase_otp_email`.
- Multi-role: `profiles.roles user_role[]` permite mesmo email ser produtor + corretora. Tela `/painel/escolher` aparece quando há 2+ papéis; cookie `mp_active_role` armazena modo ativo.
- No server, usar `getUser()` (NÃO `getSession()`).
- Após login confirmado, redirecionar para o painel correto — **nunca deixar o usuário preso na tela de login**.

## Variáveis de ambiente

Sempre usar as chaves novas:

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_*`)
- `SUPABASE_SECRET_KEY` (`sb_secret_*`)

Não usar `anon`/`service_role` legacy como padrão.

## O que NÃO fazer

- Não usar Tailwind v4.
- Não usar `@supabase/auth-helpers-nextjs`.
- Não usar `shadcn-ui` (pacote antigo).
- Não criar tabela sem RLS.
- Não misturar nomes/código entre Milsaca e Kavita.
- Não fazer `git push` remoto sem confirmar com o usuário.
- Não rodar `db:push` remoto sem credenciais confirmadas.

## Documentação

A documentação extensa fica no vault Obsidian em `C:\Users\rickj\saas\_Milsaca\` (com underscore — colisão case-insensitive com a pasta `milsaca/` do código no Windows). Comece sempre lendo `_Milsaca/09 - Ultima Sessao.md` no handoff entre sessões; atualize ele quando terminar.
