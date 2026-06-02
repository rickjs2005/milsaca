# Contribuindo com o Milsaca

Guia de processo pra quem vai mexer no código. Para entender **o que** é o projeto e como rodar, leia o [`README.md`](./README.md) primeiro. Para **como o sistema funciona por dentro**, leia [`docs/ARQUITETURA.md`](./docs/ARQUITETURA.md). As convenções canônicas (design tokens, regras rígidas) estão no [`CLAUDE.md`](./CLAUDE.md).

---

## Índice

- [Antes de começar](#antes-de-começar)
- [Fluxo de trabalho](#fluxo-de-trabalho)
- [Padrões de código](#padrões-de-código)
- [Receitas comuns](#receitas-comuns)
  - [Adicionar uma migration](#adicionar-uma-migration)
  - [Adicionar uma Server Action](#adicionar-uma-server-action)
  - [Adicionar uma tela](#adicionar-uma-tela)
- [Testes](#testes)
- [Antes de commitar](#antes-de-commitar)
- [Commits e Pull Requests](#commits-e-pull-requests)
- [Segurança](#segurança)
- [Definition of Done](#definition-of-done)

---

## Antes de começar

1. Leia o `README.md` (setup, stack, arquitetura resumida).
2. Leia o `CLAUDE.md` — **convenções obrigatórias**: stack fixa (Tailwind v3, sem auth-helpers, sem shadcn-ui antigo), design tokens, regras de auth, e o "o que NÃO fazer".
3. Tenha o `.env.local` preenchido (peça as chaves ao mantenedor).
4. Confirme que o ambiente está são: `pnpm install && pnpm type-check && pnpm lint`.

---

## Fluxo de trabalho

1. **Branch a partir de `main`**: `feat/avaliacoes-corretora`, `fix/encoding-descricao`, `chore/ci-typecheck`.
2. Faça a mudança pequena e coesa (um assunto por branch/PR).
3. `pnpm type-check` e `pnpm lint` **passando**.
4. Commit (o hook de pre-commit valida — ver [Segurança](#segurança)).
5. Abra PR pra `main`. O CI roda lint + type-check.

> Rode tudo a partir da **raiz** do monorepo. No Windows, `pnpm dev:web` de dentro de `apps/web/` falha (é script da raiz).

---

## Padrões de código

- **TypeScript estrito.** Sem `any` solto; tipe os retornos de query do Supabase.
- **Idioma:** código e schema do banco em **inglês** (`corretora_id`, `leads`, `created_at`); UI, textos e comentários úteis em **pt-BR**.
- **Design:** use os tokens da marca (`milsaca-cafezal`, `milsaca-dourado`, `neutral-*` em vez de `slate-*`, `success/warning/danger/info`, `text-h1`/`text-body`...). Regras de contraste e a lista completa estão no `CLAUDE.md`. Reaproveite componentes de `@/components` e `@milsaca/ui`.
- **Validação:** toda entrada de usuário passa por **Zod** (schemas em `_lib/schemas.ts`).
- **RLS é obrigatória** em toda tabela `public` nova — sem exceção.
- **Erros:** nunca vaze erro cru do Postgres pro usuário — use `friendlyPostgresError`.
- **Server:** use `getUser()`, nunca `getSession()`.

---

## Receitas comuns

### Adicionar uma migration

> ⚠️ O remoto está dessincronizado das migrations locais (**drift conhecido**). `supabase db push` é **inseguro**. Siga o fluxo do time:

1. Escreva a migration **idempotente** (`create table if not exists`, `create or replace`, `add column if not exists`). Convenção de nome/formato: [`docs/milsaca/convencao-migrations.md`](./docs/milsaca/convencao-migrations.md).
2. Aplique no remoto via **MCP `apply_migration`** (ou, se tiver acesso, pela CLI com cuidado). Adicione também o arquivo `.sql` em `supabase/migrations/` pra registrar no repo.
3. **Habilite RLS** na tabela nova + crie as policies (select/insert/update/delete). Tabela sem policy = dado inacessível **ou** exposto — nunca deixe sem.
4. **Regenere os types**: `packages/types/src/database.ts`. Prefira regerar via **MCP** — o `supabase gen types` da CLI no Windows injeta lixo (`Initialising login role...` + `<claude-code-hint />`) que quebra o type-check até limpar.
5. Rode o **advisor de segurança** do Supabase depois de qualquer DDL (pega RLS faltando, views inseguras).
6. `pnpm type-check` (os tipos novos têm que bater com o código).

### Adicionar uma Server Action

Siga o esqueleto padrão (todas as mutations seguem isto):

```ts
"use server";
export async function minhaAction(formData: FormData) {
  const user = await requireUser();            // 1. auth (ou requireAppAdmin / getProfile)
  const parsed = meuSchema.safeParse(           // 2. validação Zod
    formDataToObject(formData, ["arrayKeys"]),
  );
  if (!parsed.success) {
    redirect(`/rota?error=${encodeURIComponent(flattenZodErrors(parsed.error))}`);
  }
  const supabase = await createClient();
  const { error } = await supabase.from("tabela").update(parsed.data).eq("id", id);
  if (error) {                                  // 3. erro sanitizado
    redirect(`/rota?error=${encodeURIComponent(friendlyPostgresError(error))}`);
  }
  await supabase.from("audit_log").insert({...}); // 4. auditoria (quando aplicável)
  revalidatePath("/rota");                        // 5. revalida
  // 5b. se mudou dado público, revalidatePath(`/c/${slug}`)
  redirect("/rota?saved=1");
}
```

`?saved=1` / `?error=` são captados pelo `<ToastFromSearchParams>` no layout.

### Adicionar uma tela

Há um kit e regras de design pro painel da corretora (17 telas catalogadas: helpers, receita de tela-lista, padrões). **Consulte antes de criar/editar tela** — está documentado no `CLAUDE.md` e nos docs de design. Reaproveite `<PageHeader>`, `<SubmitButton>`, `<ConfirmSubmit>`, `<StatusBadge>`, `<StarsDisplay>`, etc.

---

## Testes

- **Unit (Vitest):** schemas Zod, helpers (`friendlyPostgresError`, `normalizePhoneBR`), regras COB (`@milsaca/cob`). Arquivos `*.test.ts` ao lado do código.
- **Smoke (Node + service_role):** scripts em `apps/web/scripts/smoke-*.mjs` validam RLS, aprovação, vazamento público. Rodam contra o banco real.
- **E2E (Playwright):** fluxos críticos (cadastro→aprovação→login, catálogo→WhatsApp). Cobertura ainda parcial — ao tocar um fluxo crítico, adicione/atualize o teste.

Cobertura ainda não é completa; priorize testar **regras de negócio puras** (COB, schemas) e **RLS** (smokes).

---

## Antes de commitar

```bash
pnpm type-check   # tem que passar
pnpm lint         # tem que passar
pnpm format       # opcional (Prettier)
```

O **hook de pre-commit** (`.git/hooks/pre-commit`) bloqueia automaticamente:
- qualquer arquivo `.env` staged (exceto `.env.example`);
- padrões de segredo (chaves `sb_secret_`, JWTs `eyJ...`, private keys, tokens AWS/GitHub/Stripe/Resend).

> O hook é **local a cada clone** (`.git/hooks/` não é versionado). Ao clonar, replique-o (peça ao time o script ou copie de outro clone). Em emergência justificada: `git commit --no-verify` (evite).

---

## Commits e Pull Requests

- **Mensagens de commit** seguem prefixos convencionais, em pt-BR:
  `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `perf:`.
  Ex.: `feat(corretora): widget de avaliação no catálogo do produtor`.
- **Um PR = um assunto.** Descreva o quê + por quê + como testar.
- **CI** roda lint + type-check no PR; precisa passar.
- Evite commitar arquivos gerados/transitórios (`.next/`, `node_modules/`, `.env.local`) — já cobertos pelo `.gitignore`.

---

## Segurança

- **Nunca** comite `.env.local` nem a chave `sb_secret_*`/service_role. O hook bloqueia, mas a disciplina vem antes.
- **A RLS é a única muralha dos dados** (a publishable key é pública por design). Toda tabela/feature nova precisa de RLS correta — teste com um smoke quando fizer sentido.
- O repositório é **privado**; não torne público sem revisar exposição de schema/RLS.
- Service role (`sb_secret_*`) só em **scripts CLI** (`apps/web/scripts/*.mjs`) e em código de servidor que **não** é pré-renderizado no client.

---

## Definition of Done

- [ ] `pnpm type-check` e `pnpm lint` passam
- [ ] Entrada de usuário validada com Zod
- [ ] Tabela nova tem RLS + policies; advisor de segurança rodado após DDL
- [ ] Types regenerados se o schema mudou
- [ ] Dado público afetado → `revalidatePath` na action
- [ ] Sem segredo/`.env` no diff (o hook confirma)
- [ ] UI em pt-BR usando tokens da marca; reaproveitou componentes existentes
- [ ] Testou o caminho feliz e os erros (toast aparece, nada vaza erro cru)
