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

Paleta Milsaca — define em `packages/config-tailwind/tokens.js`.

**Legacy (em uso desde 2026-05) — manter pra compat:**

| Token | Hex | Uso |
| --- | --- | --- |
| `milsaca.verde` | `#2D3A2E` | UIs já existentes, painel produtor/corretora |
| `milsaca.verde-claro` | `#4A5C4C` | Texto secundário |
| `milsaca.dourado` | `#C9A961` | Destaques (CTA, ativo, badges) |
| `milsaca.dourado-claro` | `#E0C68A` | Hover dourado |
| `milsaca.cream` | `#FAF7F0` | Fundo principal claro |
| `milsaca.cream-escuro` | `#EFEADB` | Borda suave, divisores |

**Premium (Fase 2 redesign admin, 2026-05-20) — usar em componentes novos:**

| Token | Hex | Uso |
| --- | --- | --- |
| `milsaca.cafezal` | `#0F3D2E` | Sidebar admin, headers escuros premium |
| `milsaca.folha` | `#1B5E3F` | Success states, hover em itens dark |
| `milsaca.preto` | `#1A1A1A` | Texto principal em fundo claro |
| `milsaca.cream-claro` | `#F5E6C8` | Hover suave em cards |

**Shadows nomeados** (também no preset):
- `shadow-card` — sombra padrão de card (sutil)
- `shadow-card-hover` — hover em card interativo
- `shadow-elevated` — modal, dropdown, popover

**Radius nomeados:**
- `rounded-card` (16px) — cards padrão admin
- `rounded-pill` (9999px) — chips, badges, pílulas
- `rounded-milsaca` (16px) — alias legacy

**Regra de uso:** ao refatorar telas críticas (admin shell, sidebar, hero, dashboard), prefira keys premium. UIs existentes ficam com legacy até serem tocadas.

### Tokens de fundação (proposta D1, 2026-05-30 — aditivos, nada removido)

> Definidos em `packages/config-tailwind/tokens.js` e expostos pelo preset (`index.js`). São a base canônica pra parar de improvisar com `slate-*`/`emerald-*`/`sky-*`/`rose-*` soltos. Aplicação nas telas/componentes é fase posterior (D2+).

**Cores semânticas de estado** (sóbrias, derivadas da marca — escalas `50/100/500/600/700`):

| Token | 500 (hex) | Deriva de / harmonia | Uso |
| --- | --- | --- | --- |
| `success` | `#2E7D52` | folha `#1B5E3F` (= `success-600`) | sucesso, confirmado, ativo |
| `warning` | `#C98A1E` | âmbar quente que conversa com o dourado | atenção, pendente |
| `danger` | `#B23B2E` | vermelho terroso (não rose puro) | erro, destrutivo, rejeitado |
| `info` | `#4B6B82` | azul-acinzentado discreto (não sky vivo) | informativo, neutro-frio |

Convenção: `bg-{token}-50` + `text-{token}-700` + `border-{token}-100` pra badges/alerts suaves; `text-{token}-600`/`700` pra texto sobre cream/branco (AA); `500` como cor cheia (preencher botão/ícone). **Substituem** `emerald→success`, `amber→warning`, `rose/red→danger`, `sky→info`.

**Neutros de marca** — escala `neutral.50..900`, cinza levemente quente/esverdeado (hue cafezal nas pontas). É a alternativa de marca ao `slate-*` genérico. **Use `neutral-*` no lugar de `slate-*`** em texto/borda/fundo neutro (`text-neutral-600` p/ secundário, `border-neutral-200` p/ divisores, `bg-neutral-50` p/ fundo sutil). `slate` não foi removido (compat), mas é desencorajado em código novo.

**Tipografia semântica** (`fontSize` com line-height e weight embutidos; tamanhos default do Tailwind seguem válidos):

| Classe | Tamanho | line-height | weight | Uso |
| --- | --- | --- | --- | --- |
| `text-display` | 40px | 1.1 | 700 | hero / landing |
| `text-h1` | 32px | 1.15 | 700 | título de página |
| `text-h2` | 24px | 1.2 | 600 | seção |
| `text-h3` | 20px | 1.3 | 600 | subseção / título de card |
| `text-body-lg` | 18px | 1.6 | 400 | parágrafo destaque |
| `text-body` | 16px | 1.6 | 400 | corpo padrão |
| `text-body-sm` | 14px | 1.5 | 400 | corpo secundário |
| `text-label` | 14px | 1.4 | 500 | labels de form |
| `text-caption` | 12px | 1.4 | 400 | meta / hint / timestamp |

**Espaçamento** — escala canônica é a do Tailwind: **4 / 8 / 12 / 16 / 24 / 32 / 40** (`p-1/2/3/4/6/8/10`). Dois aliases de layout só pros gaps recorrentes: `p-card` (20px, padding interno de card) e gap/`mt-section` etc. via `section` (40px, espaço entre seções). Não inventar tokens de espaço além desses.

**Estados (convenção a aplicar nos componentes na fase 2):**
- **Foco:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` — `ring` default agora é dourado `#C9A961` (`ringColor.DEFAULT`).
- **Disabled:** `disabled:opacity-50 disabled:cursor-not-allowed`.
- **Hover:** usar `folha`/`cafezal` em superfícies escuras e `dourado`/`dourado-claro` em realces; em superfícies claras, escurecer 1 tom (`cream`→`cream-escuro`, `neutral-50`→`neutral-100`).

**Contraste / dourado (importante):** o `dourado` `#C9A961` **não passa AA como texto** sobre `cream`/branco. Regra: **dourado só em fundo, borda, ícone de realce e estados ativos** — nunca como texto de leitura. Pra "texto dourado" use o token `milsaca.dourado-texto` `#8A6D2F` (~AA sobre cream), ou prefira `cafezal`/`preto`. (Hoje há ~68 usos de `text-milsaca-dourado` que deverão migrar pra `dourado-texto` na fase de componentes.)

Fonte: **Inter** (via `next/font/google` no web, `@expo-google-fonts/inter` no mobile).

### Tema claro/escuro (web, 2026-06-12)

O usuário escolhe Claro | Escuro | Sistema (`ThemeToggle` em `@/components/theme-toggle.tsx`;
persistência em `localStorage.mp_theme`; script anti-flash no layout raiz; default sem escolha = CLARO).
O escuro funciona por um **shim em `globals.css`** (bloco `.dark` FORA de @layer) que remapeia as ~40
utilities claras mais usadas (`bg-white`, `bg-milsaca-cream*`, `text-milsaca-cafezal/preto/verde`,
`neutral/slate-*`, tints/bordas de estado, hovers).

**Regras pra código novo:**
- **NÃO usar `dark:bg-*`/`dark:text-*` em classe que o shim já mapeia** — o shim vence o empate de
  especificidade e o `dark:` é ignorado silenciosamente.
- Em tela/componente novo, **preferir os tokens semânticos** (`bg-background`, `bg-card`,
  `text-foreground`, `border-border`) que trocam sozinhos via CSS vars.
- Superfícies já escuras no claro (sidebar `bg-milsaca-cafezal`, heros) NÃO são remapeadas — seguem iguais.

## Comunidade (rede social interna)

Feed multi-formato (texto opcional + foto ≤5MB + vídeo ≤50MB + áudio gravado ≤2min/15MB), curtidas,
comentários, seguir, perfil público com **apelido** (nome social — contratos seguem com `full_name`).
- Rotas: wrappers finos em `/painel/{corretora,produtor}/comunidade{,/post/[id],/perfil/[id],/pessoas}`;
  páginas reais em `@/components/social/pages/`; lógica em `@/lib/social/{queries,actions}.ts`.
- Banco: tabelas `social_*` (RLS completa), view `social_perfis` (definer, só campos públicos),
  bucket Storage `social` (público pra leitura; escrita só em `{user_id}/...`). Contadores e
  notificações in-app (kind `social`, SEM WhatsApp de propósito) via triggers.
- ⚠️ CSP: `<video>`/`<audio>` usam **media-src** (já liberado pro host do Supabase no next.config) —
  img-src NÃO cobre mídia.
- Posts não podem ser vazios (constraint `social_posts_conteudo`: texto OU mídia).

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
