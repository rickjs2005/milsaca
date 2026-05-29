# Deploy contínuo (CD) — Milsaca

Workflow: `.github/workflows/cd.yml`. Dispara **só depois que o CI passa verde
num push no `main`** (`workflow_run`), e também sob demanda
(Actions → CD → **Run workflow**).

Três jobs independentes:

| Job | O que faz | Freio |
|---|---|---|
| `deploy-functions` | `supabase functions deploy sync-cotacoes` | — (idempotente) |
| `deploy-migrations` | `supabase db push` (dry-run antes) | **aprovação manual** (Environment) |
| `deploy-web` | `vercel pull/build/deploy --prebuilt --prod` em `apps/web` | — |

> `send-dispatch` **não** é deployado: providers (WhatsApp/Resend) ainda não
> implementados — ver `supabase/functions/send-dispatch/README.md`.

---

## 1. Secrets do repositório

Settings → Secrets and variables → **Actions** → New repository secret (ou
`gh secret set NOME`). **Nenhum vai pro git.**

| Secret | De onde tirar |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | PAT `sbp_…` — https://supabase.com/dashboard/account/tokens |
| `SUPABASE_PROJECT_REF` | ref do projeto (está no `apps/web/.env.local`, na URL `https://<ref>.supabase.co`) |
| `SUPABASE_DB_PASSWORD` | senha do Postgres — Dashboard → Project Settings → Database |
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID` | `apps/web/.vercel/project.json` após `vercel link` (campo `orgId`) |
| `VERCEL_PROJECT_ID` | idem (`projectId`) |

Exemplo via CLI (rode na raiz do repo, com `gh` logado):

```powershell
gh secret set SUPABASE_ACCESS_TOKEN
gh secret set SUPABASE_PROJECT_REF
gh secret set SUPABASE_DB_PASSWORD
gh secret set VERCEL_TOKEN
gh secret set VERCEL_ORG_ID
gh secret set VERCEL_PROJECT_ID
```

### Obter os IDs da Vercel

```powershell
cd apps\web
vercel link        # escolha o projeto Milsaca; gera .vercel/project.json
Get-Content .vercel\project.json   # copie orgId e projectId
```

`.vercel/` já está no `.gitignore` — não comitar.

---

## 2. Environment `production-db` (o freio das migrations)

Settings → **Environments** → New environment → `production-db`.

- Marque **Required reviewers** e adicione você mesmo (`rickjs2005`).
- O job `deploy-migrations` vai **pausar** pedindo aprovação no GitHub antes de
  rodar `db push`. Aprove em Actions → run do CD → **Review deployments**.
- Confira o log do passo **Dry-run** antes de aprovar: se as 46 migrations já
  estão aplicadas no remoto, o `db push` deve dizer "no changes" (ou listar só
  as pendentes). Se acusar drift de histórico, resolva localmente antes.

---

## 3. Desligar o auto-deploy nativo da Vercel (evita deploy dobrado)

Como o web passa a ser deployado pelo Actions (gated no CI verde), desative o
deploy automático do branch de produção na Vercel pra não subir duas vezes:

- Vercel → projeto → **Settings → Git**.
- Desative **"Automatically deploy"** para o Production Branch (`main`).
- Previews de PR podem continuar ligados (úteis e não conflitam).
- Confirme **Root Directory = `apps/web`** (Settings → General).
- As env vars de produção (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
  `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WHATSAPP_CONTATO`) ficam **na Vercel** —
  o `vercel pull` as traz pro build. Não vão pro Actions nem pro git.

> Alternativa: manter o auto-deploy nativo da Vercel e remover o job
> `deploy-web` do `cd.yml`. Menos manutenção e preview por PR de graça, mas o
> deploy web deixa de ficar atrás do CI verde.

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
- **Migrations:** log do `db push` no run do Actions.
- **Web:** abrir a URL de produção e confirmar o build novo.
- **Smokes:** `smoke-aprovacao`, `smoke-public-leak`, `smoke-rbac`,
  `smoke-fundadora` em `apps/web/scripts/`.
