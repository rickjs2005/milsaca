# Deploy contínuo (CD) — Milsaca

Workflow: `.github/workflows/cd.yml`. Dispara **só depois que o CI passa verde
num push no `main`** (`workflow_run`), e também sob demanda
(Actions → CD → **Run workflow**).

O CD tem **um job**:

| Job | O que faz | Freio |
|---|---|---|
| `deploy-functions` | `supabase functions deploy sync-cotacoes` | — (idempotente) |

> `send-dispatch` **não** é deployado: providers (WhatsApp/Resend) ainda não
> implementados — ver `supabase/functions/send-dispatch/README.md`.
>
> **Web NÃO entra no CD** (decisão 2026-05-29) — o `apps/web` é deployado pela
> **integração Git nativa da Vercel**; ver **seção 3**.
>
> **Migrations NÃO entram no CD** — `supabase db push` é inseguro neste repo.
> Aplicação manual via MCP; ver **seção 2**.

---

## 1. Secrets do repositório

Settings → Secrets and variables → **Actions** → New repository secret (ou
`gh secret set NOME`). **Nenhum vai pro git.**

| Secret | De onde tirar |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | PAT `sbp_…` — https://supabase.com/dashboard/account/tokens |
| `SUPABASE_PROJECT_REF` | ref do projeto (está no `apps/web/.env.local`, na URL `https://<ref>.supabase.co`) |

Ambos **já estão configurados** (set nesta sessão a partir do `.env.local`). Pra
recriar (raiz do repo, `gh` logado):

```powershell
gh secret set SUPABASE_ACCESS_TOKEN
gh secret set SUPABASE_PROJECT_REF
```

> Não há secrets de Vercel: o web usa a integração Git nativa (seção 3).

---

## 2. Migrations — aplicação manual via MCP (FORA do CD)

`supabase db push` **não é usado** neste repo. Motivo:

- O `supabase_migrations.schema_migrations` do remoto está **dessincronizado**
  do schema real: migrations `20260603`→`20260620` foram aplicadas via SQL cru
  (não rastreadas) e as 12 da auditoria entraram via MCP sob versão própria.
  `db push` tentaria reaplicá-las → erro "already exists".
- Há **5 pares de filename com timestamp duplicado** (`20260528/29/30/31`,
  `20260601`) que o `db push` nem escaneia direito.

**Como aplicar uma migration nova no remoto:**

1. Escreva a migration **idempotente** (`create or replace`, `if not exists`;
   pra remover coluna de view use `drop view if exists` + `create view`, não
   `create or replace view`).
2. Aplique pelo **Supabase MCP** (`apply_migration`), **uma a uma**, conferindo
   o resultado de cada (ou via Supabase Studio → SQL Editor).
3. Regenere os tipos quando possível (ver `convencao-migrations.md`).

> O Environment `production-db` (criado pra um job `deploy-migrations` que foi
> **removido**) ficou órfão — pode apagar em Settings → Environments. O secret
> `SUPABASE_DB_PASSWORD` não é mais necessário.

---

## 3. Web — integração Git nativa da Vercel

O `apps/web` **não** é deployado pelo CD. Quem cuida é a **integração Git nativa
da Vercel** (decisão 2026-05-29): sem secrets de Vercel, sem job no Actions, com
preview por PR de graça. Trade-off aceito: o deploy web não fica "atrás do CI
verde".

Setup (uma vez, no dashboard da Vercel):

1. **Add New → Project** → importar o repo `rickjs2005/milsaca`.
2. **Root Directory = `apps/web`** (Settings → General).
3. Manter **"Automatically deploy"** do branch `main` **LIGADO** (Settings → Git).
4. **Env vars de produção** (Settings → Environment Variables):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WHATSAPP_CONTATO`
   (+ `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` quando provisionar o Sentry).
5. O `apps/web/vercel.json` (region `gru1`, build) já está versionado.

A partir daí, todo push no `main` deploya o web automaticamente.

---

## 4. Pré-requisito de uma vez (fora do CD)

Pra `sync-cotacoes` validar o header do cron, o secret precisa existir no
projeto Supabase (não entra no workflow):

```powershell
supabase secrets set CRON_SECRET=<valor>   # mesmo valor usado em apply-cron.mjs
```

Rotação do secret: `apps/web/scripts/rotate-cron-secret.mjs` +
`apps/web/scripts/apply-cron.mjs`.

---

## 5. Validar pós-deploy

- **Function:** Supabase Dashboard → Edge Functions → `sync-cotacoes` com
  timestamp de deploy novo. O cron chama por URL fixa, então a versão nova
  entra sozinha no próximo disparo (`0 21 * * 1-5` UTC) — ou force agora com
  `node apps/web/scripts/seed-conilon-now.mjs`. Cheque o Conilon:
  `select * from market_quotes where source = 'cepea_conilon' order by created_at desc limit 5;`
- **Web:** abrir a URL de produção e confirmar o build novo.
- **Smokes:** `smoke-aprovacao`, `smoke-public-leak`, `smoke-rbac`,
  `smoke-fundadora` em `apps/web/scripts/`.
