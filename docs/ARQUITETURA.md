# Arquitetura do Milsaca

Documento técnico de referência: como o sistema funciona por dentro. Pré-requisito: [`README.md`](../README.md) (visão geral + setup). Convenções: [`CLAUDE.md`](../CLAUDE.md). Processo de contribuição: [`CONTRIBUTING.md`](../CONTRIBUTING.md).

> Schema descrito a partir do banco real (38 tabelas, 23 enums, 3 views, ~50 funções). Pode haver pequenas defasagens — a fonte da verdade é `packages/types/src/database.ts` + as migrations.

---

## Índice

- [1. Visão de alto nível](#1-visão-de-alto-nível)
- [2. Camadas da aplicação](#2-camadas-da-aplicação)
- [3. Modelo de dados](#3-modelo-de-dados)
- [4. Multi-tenant & RLS](#4-multi-tenant--rls)
- [5. Autenticação & sessão](#5-autenticação--sessão)
- [6. Ciclo de uma mutation (Server Action)](#6-ciclo-de-uma-mutation-server-action)
- [7. Estratégia de cache](#7-estratégia-de-cache)
- [8. Domínio do café](#8-domínio-do-café)
- [9. Edge functions & jobs agendados](#9-edge-functions--jobs-agendados)
- [10. Funções e RPCs principais](#10-funções-e-rpcs-principais)
- [11. Enums (máquinas de estado)](#11-enums-máquinas-de-estado)
- [12. Observabilidade & compliance](#12-observabilidade--compliance)

---

## 1. Visão de alto nível

```
   ┌─────────────┐     ┌─────────────┐
   │  Web (Next) │     │ Mobile(Expo)│        Clients
   │ admin /     │     │  produtor   │
   │ corretora / │     │             │
   │ produtor    │     │             │
   └──────┬──────┘     └──────┬──────┘
          │  @supabase/ssr     │  supabase-js + secure-store
          │  (cookies)         │
          ▼                    ▼
   ┌───────────────────────────────────┐
   │          Supabase (cloud)          │
   │  ┌─────────────────────────────┐   │
   │  │ Postgres 17  + RLS (tenant) │   │   ← muralha de dados
   │  │  tabelas / views / funções  │   │
   │  └─────────────────────────────┘   │
   │  Auth (email+senha)  ·  Realtime    │
   │  Edge Functions  ·  pg_cron         │
   └───────────────────────────────────┘
          ▲                    ▲
          │ scraping/APIs      │ cron (pg_cron → edge)
   CEPEA · ICE NY · PTAX   jobs de manutenção/nudges
```

- O **runtime web/mobile nunca usa `service_role`** — só a `publishable key`, limitada pela RLS. `service_role` (`sb_secret_*`) só em scripts CLI (`apps/web/scripts/`) e código de servidor não pré-renderizado.
- Toda regra de acesso vive na **RLS do Postgres**, não no app. O app é um cliente "burro" do ponto de vista de autorização.

---

## 2. Camadas da aplicação

### `apps/web` (Next.js 16 App Router)

```
src/app/
├── (root)            home pública, /entrar, /cadastrar, recuperação,
│                     /laudos/[id] (público), /c/[slug] (vitrine corretora),
│                     /contratos/[id]/verificar (público)
├── admin/            painel da plataforma (aprovação, planos, assinaturas,
│                     configurações, auditoria, moderação, leads)
├── onboarding/       wizards corretora + produtor
├── painel/
│   ├── corretora/    leads, leads-whatsapp, lotes (COB), ofertas, contratos,
│   │                 entregas, pagamentos, produtores, convidar, compradores,
│   │                 cotações, analytics, assinatura, equipe, perfil
│   ├── produtor/     início, laudos (sacas), negociações, financeiro,
│   │                 corretoras (catálogo + avaliação), perfil
│   └── escolher/     seletor de papel (multi-role)
└── api/              ex.: /api/leads/whatsapp, /api/lgpd/exportar
```

Cada feature usa a convenção `_actions.ts` (Server Actions), `_lib/` (queries, schemas, helpers) e `_components/` (UI local).

### `apps/mobile` (Expo SDK 54)
App do produtor: `(auth)` (entrar/cadastrar/esqueci) + `(painel)` (tabs + atalhos). Sessão em `expo-secure-store`.

### Packages compartilhados

| Package | Papel |
| --- | --- |
| `@milsaca/types` | tipos TS + `database.ts` gerado do Supabase |
| `@milsaca/db` | clients Supabase: `web/server` (cookie), `web/public` (anon, p/ `unstable_cache`), `mobile` |
| `@milsaca/cob` | **calculadora pura** da IN 8/2003 (sem deps de runtime, testável isolada) |
| `@milsaca/ui` | componentes compartilhados |
| `@milsaca/config-tailwind` | tokens de design (cores, tipografia, sombras) |
| `@milsaca/eslint-config`, `@milsaca/typescript-config` | bases de lint/TS |

---

## 3. Modelo de dados

38 tabelas em `public`, agrupadas por domínio. Toda tabela "de tenant" carrega `corretora_id`.

| Domínio | Tabelas |
| --- | --- |
| **Identidade & acesso** | `profiles`, `corretoras`, `app_admins`, `corretora_invites` |
| **Produtores** | `produtores`, `produtor_contatos`, `produtor_pagamentos` |
| **Pipeline comercial** | `leads`, `lead_events`, `lead_distribution_rules`, `lead_waitlist`, `propostas`, `whatsapp_leads` |
| **Café & qualidade** | `lotes`, `classificacoes_cob`, `coffee_types` |
| **Contratos & logística** | `contratos`, `entregas` |
| **Compradores & ofertas** | `compradores`, `ofertas_comprador` |
| **Cotações & mercado** | `cotacoes`, `market_quotes`, `quote_sources`, `pracas`, `price_alerts` |
| **Reputação** | `corretora_avaliacoes`, `favoritos` |
| **SaaS / plataforma** | `plans`, `subscriptions`, `platform_settings`, `corretora_waitlist` |
| **Mensageria & notificações** | `notifications`, `notification_templates`, `message_dispatches` |
| **Compliance & ops** | `audit_log`, `lgpd_consents`, `moderation_reports`, `rate_limits`, `system_events` |

### Núcleo de relacionamentos

```
auth.users 1───1 profiles ──┐ (corretora_id, roles[])
                            │
              corretoras ◄──┘ 1───N  produtores / produtor_contatos
                  │
                  ├─ N leads ──── 1 (produtor_id | contato_id)   ── N lead_events
                  │      └─ vira ─► contratos ── N entregas ── N produtor_pagamentos
                  ├─ N lotes ──── 1 classificacoes_cob (laudo COB)
                  │      └─ ofertas_comprador ─► compradores
                  ├─ N cotacoes (mercado/manual)  ← quote_sources / pracas / coffee_types
                  ├─ N corretora_avaliacoes ◄── produtores (gated: só quem negociou)
                  ├─ 1 subscriptions ─► plans
                  └─ N favoritos / whatsapp_leads
```

Pontos importantes:
- **`profiles`** estende `auth.users` (1:1, criado pelo trigger `handle_new_user`). Tem `roles user_role[]` (multi-role) e `corretora_id` (vínculo do operador à corretora).
- **`leads.produtor_id` XOR `leads.contato_id`**: um lead aponta pra produtor **real** (`profiles`) **ou** pra um **contato sombra** (`produtor_contatos` — produtor ainda sem conta). Isso permite a corretora cadastrar produtores offline e "reivindicar" depois (`produtor_contatos.claimed_profile_id`).
- **`contratos`** nascem de um `lead` (`lead_id`), vinculam `comprador_id` e geram `entregas`; entregas geram `produtor_pagamentos`.
- **`lotes` + `classificacoes_cob`** são o laudo de qualidade; viram PDF público via RPC.

---

## 4. Multi-tenant & RLS

**Regra de ouro: toda tabela `public` tem RLS habilitada.** O isolamento é por `corretora_id`, com helpers SQL:

| Função | Retorna |
| --- | --- |
| `is_admin()` / `is_app_admin()` | usuário está em `app_admins`? |
| `current_corretora()` | `corretora_id` do profile logado |
| `current_role()` / `current_roles()` | papel ativo / todos os papéis |
| `is_corretora()` / `is_corretora_dono()` | é corretora? é o dono (vs operador)? |

Padrão típico de policy de tabela de tenant:

```sql
-- leitura: admin OU mesma corretora
using ( is_admin() or corretora_id = current_corretora() )
-- escrita: idem no with check
```

### Views públicas (leitura anônima segura)

`corretoras_publicas`, `lotes_publicos` e `unified_quotes` rodam com **`security_invoker = off`** de propósito: executam com os privilégios do dono, **contornando a RLS das tabelas de baixo**, mas expõem **apenas colunas não-sensíveis e agregados** (ex.: `corretoras_publicas` não tem CNPJ/endereço; expõe `total_produtores`, `total_negociacoes`, `rating_media`). É como produtor/visitante anônimo vê dados sem furar a segurança. O advisor do Supabase marca essas views como `security_definer_view` — é **intencional e aceito** (sem isso, agregados não funcionariam pra anônimo).

---

## 5. Autenticação & sessão

- **Email + senha** pra todos (produtor, corretora, admin). Magic link foi **descartado** (Gmail Safe Links faz prefetch e queima o link one-time).
- **Signup:** trigger `handle_new_user()` cria o `profile`, blinda `role='admin'` (admin só via `app_admins`), e faz claim automático de `produtor_contatos` por email.
- **Convite de corretora:** `corretora_invites` + RPCs `consume_corretora_invite` / `get_corretora_invite` — o dono cria conta via link único (expira em 7 dias, uso único).
- **Multi-role:** `profiles.roles user_role[]`. `/painel/escolher` aparece com 2+ papéis; cookie `mp_active_role` guarda o modo ativo.
- **No servidor:** sempre `getUser()` (revalida no Auth), **nunca** `getSession()`.
- **Middleware** protege `/admin` e `/painel`; `enforceProfileStatus` bloqueia pendente; gate de `subscriptions` bloqueia ações custosas quando expirada. Após login, redireciona pro painel certo (nunca prende no login).

---

## 6. Ciclo de uma mutation (Server Action)

```
Form (client) ──POST──► Server Action ("use server")
   1. requireUser() / requireAppAdmin() / getProfile()      ← auth
   2. Zod safeParse(formDataToObject(...))                  ← validação
        └─ falhou → redirect(?error=flattenZodErrors)
   3. supabase.from(...).insert/update/delete               ← op (RLS aplica!)
        └─ erro → redirect(?error=friendlyPostgresError)     ← nunca vaza erro cru
   4. audit_log.insert({...})                               ← auditoria
   5. revalidatePath(...)  [+ revalidatePath(/c/<slug>)]    ← invalida cache
   6. redirect(?saved=1)
```

`?saved=1` / `?error=` são lidos pelo `<ToastFromSearchParams>` no layout → toast (sonner). Schemas ficam em `_lib/schemas.ts`; helpers de erro em `lib/postgres-error.ts`.

> Cuidado: a Action revalida o **objeto inteiro** no submit. Um campo inválido pré-existente (ex.: CNPJ com DV errado vindo de seed) reprova a validação e **trava toda edição** — garanta dado válido na entrada.

---

## 7. Estratégia de cache

- Páginas públicas read-heavy (ex.: `/c/[slug]`) usam **`unstable_cache`** com o client **`@milsaca/db/web/public`** (sem cookie — obrigatório, pois `unstable_cache` não pode tocar APIs dinâmicas). TTL curto + `tags`.
- **Invalidação:** as Server Actions que mudam dado público chamam `revalidatePath('/c/<slug>')`. Mudança feita **fora do app** (SQL direto) **não** invalida — só via app ou limpando `.next`.
- **Next 16:** `revalidateTag` mudou de assinatura (exige 2º arg `profile`); para `unstable_cache` legado, preferimos `revalidatePath` + TTL curto. `unstable_cache` **persiste em disco no dev** (`.next/cache`) — reiniciar o server não basta; `rm -rf apps/web/.next` quando precisar forçar.

---

## 8. Domínio do café

### Classificação COB (laudo) — `@milsaca/cob`
Pacote **puro** que implementa a IN 8/2003 do MAPA: tabela de tipos (T2–T8 + intermediários), defeitos crus, peneiras, bebida, "Fora de Tipo", PVA. `lotes` (amostra) → `classificacoes_cob` (laudo, com `schema_version`). Laudo público via RPC `get_laudo_publico` (SECURITY DEFINER, sem expor o produtor) → página `/laudos/[id]` + PDF com QR (`@react-pdf/renderer`).

### Cotações & mercado
- **`market_quotes`** — indicadores de mercado populados pela edge function `sync-cotacoes` (CEPEA scraping + ICE NY Coffee C + PTAX/BCB). Escrita só por `service_role`.
- **`cotacoes`** — cotação **manual** da corretora (`quote_sources`, `pracas`, `coffee_types`). Triggers `tg_track_quote_source_*` rastreiam origem.
- **`unified_quotes`** (view) unifica mercado + manual pra exibição.
- **`price_alerts`** + `check_price_targets()` — alerta quando preço atinge alvo.
- `mark_stale_cotacoes()` marca cotações velhas.

### Leads & WhatsApp
`leads` (pipeline, status enum) + `lead_events` (timeline). Clique no WhatsApp registra `whatsapp_leads` (trigger `tg_whatsapp_lead_after_insert` + `validate_whatsapp_lead`) com mensagem enriquecida (nome/fazenda/cidade/café) → funil clique→contrato. Distribuição de leads: `lead_distribution_rules` + `pick_eligible_corretora()`; `lead_waitlist` pra fila.

### Propostas & ofertas
`propostas` (negociação produtor↔corretora, RPCs `v1_criar_oferta_produtor` / `v1_listar_propostas_produtor` / `v1_responder_proposta`, `contrapropor_lead`). `ofertas_comprador` (corretora oferta lote a comprador).

### Contratos → entregas → pagamentos
`contratos` (código auto `<slug>-<ano>-<seq>`, comissão, espelho triangular, status). Geram `entregas` (programação + romaneio de pesagem + status). Entregas geram `produtor_pagamentos` (bruto/descontos/líquido). Contrato público via `get_contrato_publico`.

### Reputação
`corretora_avaliacoes` (1-5 estrelas, **gated por RLS**: só produtor com lead/contrato avalia) + `favoritos`. Média/contagem expostas em `corretoras_publicas` (`rating_media`/`rating_count`).

---

## 9. Edge functions & jobs agendados

**Edge functions** (`supabase/functions/`):
- **`sync-cotacoes`** — busca CEPEA/ICE/PTAX e popula `market_quotes`. Agendada via `pg_cron` (dias úteis). Autorizada por header `x-cron-secret` (`CRON_SECRET`).
- **`send-dispatch`** — processa `message_dispatches` (envio de mensagens). Autorizada por `SEND_DISPATCH_SECRET`.

**Jobs de manutenção / nudges** (funções chamadas por `pg_cron`):
`expire_trials`, `expire_subscriptions`, `cleanup_old_notifications`, `process_pending_dispatches`, `check_price_targets`, `check_queue_failures`, e nudges: `nudge_stale_leads`, `nudge_trial_ending`, `nudge_delivery_late`.

---

## 10. Funções e RPCs principais

| Tipo | Funções |
| --- | --- |
| **RLS helpers** | `is_admin`, `is_app_admin`, `current_corretora`, `current_role`, `current_roles`, `is_corretora`, `is_corretora_dono` |
| **Auth/onboarding** | `handle_new_user` (trigger), `approve_corretora`, `consume_corretora_invite`, `get_corretora_invite`, `list_pending_corretora_signups`, `founder_program_status` |
| **RPCs públicas** (SECURITY DEFINER, anon) | `get_laudo_publico`, `get_contrato_publico` |
| **Equipe (self-service corretora)** | `gerar_convite_corretora_self`, `list_convites_corretora_self`, `revogar_convite_corretora_self`, `list_corretora_operadores`, `remover_operador_corretora` |
| **PII / LGPD** | `mask_doc`, `mask_nome`, `anonimizar_titular` |
| **SaaS** | `mark_subscription_paid`, `subscription_effective_status` |
| **Triggers** | `tg_set_updated_at`, `tg_track_quote_source_*`, `tg_whatsapp_lead_after_insert`, `validate_whatsapp_lead` |
| **Auditoria/eventos** | `log_audit`, `fn_log_system_event`, `reprocess_system_event` |

---

## 11. Enums (máquinas de estado)

23 enums. Os de status que viram máquina de estado na UI:

- **`lead_status`** — pipeline do lead (novo → em negociação → … → ganho/perdido)
- **`contrato_status`** — `rascunho` · `em_analise` · `ativo` · `finalizado` · `cancelado` (mudança pra `ativo` preenche `signed_at`)
- **`entrega_status`** — `programada` · `em_transito` · `recebida` · `conferida` · `cancelada`
- **`lote_status`**, **`proposta_status`**, **`oferta_status`**, **`pagamento_status`**, **`produtor_status`**, **`profile_status`**, **`subscription_status`** (`trial`/`active`/`past_due`/`canceled`/`expired`)
- Domínio: **`coffee_specie`**/`coffee_processo`/`produtor_specie`, **`regiao_cafeeira`** (10 regiões), `canal_preferido`, `regime_tributario`, `user_role` (`produtor`/`corretora`/`admin`), `corretora_member_role`, `lead_origem`, `whatsapp_lead_source`, `notification_kind`, `lgpd_consent_kind`, `billing_period`.

Valores exatos: ver `packages/types/src/database.ts` (seção `Enums`).

---

## 12. Observabilidade & compliance

- **`audit_log`** — toda mutation sensível registra ator/corretora/entidade/payload (via `log_audit` ou insert direto na action).
- **`system_events`** — eventos do sistema (com `reprocess_system_event` p/ reprocesso; `check_queue_failures` p/ alerta).
- **`lgpd_consents`** + `anonimizar_titular` + `mask_doc`/`mask_nome` — base de consentimento e anonimização (LGPD). Export por titular em `/api/lgpd/exportar`.
- **`moderation_reports`** — denúncias/moderação de conteúdo.
- **`rate_limits`** + `check_and_increment_rate()` — limitação de taxa.
- **Sentry** (erros) e **PostHog** (produto) — ver `docs/milsaca/observabilidade-sentry-posthog.md`.

---

### Referências cruzadas
- Setup & comandos → [`README.md`](../README.md)
- Convenções & design tokens → [`CLAUDE.md`](../CLAUDE.md)
- Processo de contribuição → [`CONTRIBUTING.md`](../CONTRIBUTING.md)
- Migrations → [`docs/milsaca/convencao-migrations.md`](./milsaca/convencao-migrations.md)
- Deploy → [`docs/milsaca/deploy-*.md`](./milsaca/)
