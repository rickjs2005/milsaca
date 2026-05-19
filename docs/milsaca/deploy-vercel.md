# Deploy do Milsaca na Vercel

> Guia operacional pra importar o monorepo do MilSaca como projeto Vercel
> e colocar a versão web no ar. Mobile (Expo) é tratado separadamente
> via EAS (não coberto aqui).

## 1. Projeto correto pra importar

- **Repositório:** `github.com/rickjs2005/milsaca`
- **Branch produção:** `main`
- **Framework Preset:** Next.js
- **Tipo:** Monorepo (Turborepo + pnpm)

## 2. Configuração na Vercel

Em **Project Settings → General**, configure:

| Campo | Valor |
|---|---|
| **Root Directory** | `apps/web` |
| **Framework Preset** | Next.js |
| **Build Command** | `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @milsaca/web build` |
| **Output Directory** | `.next` (default do Next; deixa em branco) |
| **Install Command** | `cd ../.. && pnpm install --frozen-lockfile` |
| **Development Command** | (vazio) |
| **Node.js Version** | 22.x |

> **Por que `cd ../..` no install/build:** o `pnpm-workspace.yaml` está
> na raiz do monorepo; sem o cd o pnpm não acha os packages internos
> (`@milsaca/db`, `@milsaca/types`, `@milsaca/ui`, `@milsaca/cob`).
>
> Alternativa mais robusta: criar `vercel.json` na raiz declarando
> isso explicitamente (deixei pra depois pra não fixar opinião
> prematuramente).

## 3. Variáveis de ambiente obrigatórias

Configure em **Project Settings → Environment Variables**, marque para
os 3 ambientes (Production, Preview, Development):

| Variável | Tipo | Valor |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Plain | `https://kulanbcyrfawlhrpqxtz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Plain | `sb_publishable_...` (dashboard Supabase → Settings → API) |
| `SUPABASE_SECRET_KEY` | **Sensitive** | `sb_secret_...` (mesma seção do dashboard) |
| `NEXT_PUBLIC_SITE_URL` | Plain | `https://<seu-dominio>` (ou URL do deploy preview pra ambientes de preview) |

### Opcionais

| Variável | Função |
|---|---|
| `LEAD_IP_SALT` | Hash IP em `/api/leads/whatsapp` (LGPD). Gere com `openssl rand -hex 32`. Sensitive. |
| `NEXT_PUBLIC_WHATSAPP_CONTATO` | Número do suporte mostrado na home pública |

## 4. Configurar Supabase pra produção

Estes passos são **no dashboard do Supabase**, não na Vercel:

1. **Authentication → URL Configuration**
   - Site URL: `https://<seu-dominio>`
   - Redirect URLs: adicionar
     - `https://<seu-dominio>/auth/callback`
     - `https://<seu-dominio>/redefinir-senha`
     - `https://*.vercel.app/auth/callback` (pra previews)

2. **Authentication → Email Templates**
   - "Confirm signup" — texto pt-BR
   - "Reset password" — texto pt-BR (já existente)
   - Templates antigos de Magic link podem ficar como estão (descontinuamos OTP)

3. **Authentication → Providers → Email**
   - "Confirm email" — decidir se exige (recomendado: sim em prod)
   - "Secure email change" — sim
   - "Mailer OTP length" — 6 (legado; não afeta senha)

4. **SMTP custom (recomendado pra produção)**
   - Em **Settings → Auth → SMTP**, configurar Resend, SendGrid ou similar
   - Sem SMTP custom, Supabase usa servidor próprio com baixo deliverability

5. **Edge function `sync-cotacoes`**
   - Confirmar que está deployada: `supabase functions deploy sync-cotacoes --no-verify-jwt`
   - Confirmar cron agendado (já feito via migration `20260522000000`)
   - `supabase secrets set CRON_SECRET=...` se ainda não setado

## 5. Domínio personalizado

Em **Project Settings → Domains**:

1. Adicionar `milsaca.app` (ou domínio escolhido)
2. Configurar DNS no provedor (Registro.br, Cloudflare etc):
   - Apex `A` → `76.76.21.21`
   - `www` `CNAME` → `cname.vercel-dns.com`
3. Aguardar emissão do certificado (segundos a minutos)
4. **Atualizar `NEXT_PUBLIC_SITE_URL`** pra novo domínio
5. **Atualizar redirect URLs no Supabase** (passo 4.1)

## 6. Primeiro deploy

1. Importar repo na Vercel: `https://vercel.com/new`
2. Selecionar branch `main`
3. Aplicar todas as configs acima
4. Clicar Deploy
5. Aguardar build (~3 min na primeira vez por causa de install limpo)

## 7. Checklist pós-deploy

Após o build verde, rodar smoke manual no domínio (vide
`checklist-smoke-producao.md`).

## 8. Como testar funcionalidades-chave em produção

> Conferir todos os itens abaixo abrindo o domínio em browser limpo (modo anônimo recomendado pra começar sem cookies).

### Home pública
- [ ] `/` carrega sem erro
- [ ] Botões CTA funcionam

### Cadastro
- [ ] `/cadastrar` abre
- [ ] Toggle Produtor/Corretora visível
- [ ] Submeter como produtor → email de confirmação chega (se confirmação ativada)
- [ ] Submeter como corretora → cai em `/entrar?ok=Cadastro recebido…`

### Login
- [ ] `/entrar` abre
- [ ] Login admin → cai em `/admin`
- [ ] Login corretora-ativa → cai em `/painel/corretora`
- [ ] Login corretora-pendente → cai em `/aguardando-aprovacao`
- [ ] Login produtor → cai em `/painel/produtor`

### Recuperação de senha
- [ ] `/esqueci-senha` abre
- [ ] Submit → mensagem genérica anti-enumeration
- [ ] Email com link de recuperação chega no inbox
- [ ] Link abre `/redefinir-senha` autenticado
- [ ] Nova senha aceita

### Admin
- [ ] `/admin` (sem auth) → redireciona pra `/entrar`
- [ ] `/admin` (como admin) → dashboard com KPIs
- [ ] Sidebar com 9 itens + auditoria + logout
- [ ] `/admin/aprovacoes` lista pendentes
- [ ] `/admin/corretoras` lista e edita
- [ ] `/admin/produtores` read-only
- [ ] `/admin/leads` mostra funil
- [ ] `/admin/auditoria` lista eventos
- [ ] Toast aparece após ações
- [ ] Confirm dialog em destrutivas

### Painel corretora
- [ ] Onboarding força preenchimento
- [ ] Trial criado automaticamente
- [ ] Banner de subscription aparece quando trial ≤7d
- [ ] `/painel/corretora/leads-whatsapp` mostra cliques recebidos
- [ ] Criar contrato funciona
- [ ] Cancelar contrato pede confirm

### Painel produtor
- [ ] Onboarding em 3 blocos
- [ ] Autocomplete IBGE funciona (precisa rede)
- [ ] Home tem CTA WhatsApp verde
- [ ] Catálogo `/painel/produtor/corretoras` carrega
- [ ] Mapa Leaflet aparece quando há corretoras com lat/lng
- [ ] Filtros funcionam (favoritas/verificadas/região)
- [ ] Click WhatsApp gera URL `wa.me/...` com mensagem enriquecida
- [ ] Registra em `whatsapp_leads`

### Proteção de rotas (cross-role)
- [ ] Produtor logado tentando `/admin` → redireciona
- [ ] Produtor logado tentando `/painel/corretora` → bloqueado
- [ ] Corretora logada tentando `/painel/produtor` → bloqueado

## 9. Troubleshooting

| Sintoma | Causa provável | Fix |
|---|---|---|
| Build falha "Cannot find module @milsaca/types" | Root Directory errado | Conferir Install Command com `cd ../..` |
| `NEXT_PUBLIC_*` undefined no runtime | Env não setada ou marcada só pra Production | Marcar pra todos os 3 ambientes |
| Auth redirect bate em URL errada | Site URL Supabase desatualizada | Atualizar §4.1 com domínio final |
| Email com link `http://localhost:3000` | `NEXT_PUBLIC_SITE_URL` não configurada | Setar na Vercel + redeploy |
| 500 em `/api/leads/whatsapp` | `SUPABASE_SECRET_KEY` não setada como Sensitive | Reconfigurar e redeploy |

## 10. Próximos passos pós-deploy

1. **CI rodando** — confirmar que `.github/workflows/ci.yml` está validando PRs (deve já estar — vide §11 do plano)
2. **Sentry / observability** — Etapa 10
3. **PostHog / product analytics** — Etapa 10
4. **2FA admin** — Etapa 9
5. **Rate limit** — Etapa 9
6. **EAS Build mobile** — Etapa 8.2
