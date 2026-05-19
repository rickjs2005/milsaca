# Relatório — Melhorias de Campos de Cadastro

Data: 2026-05-19
Branch: main (commits `e12aebb`, `550ee75`)
Tarefas: #69 → #78 (Fases A–G)

## Sumário executivo

Refatoração transversal de **9 formulários** do app web pra:

- Aplicar **máscaras visuais** com submissão de valor **normalizado** ao backend
  (docs digits-only, telefones em E.164 sem `+`).
- Trocar validação puramente por *length* por **DV check real** em CPF/CNPJ.
- Separar `cidade/UF` em campos distintos (era texto livre `"Manhuaçu/MG"`).
- Padronizar UF em select com 27 entradas (era input texto livre `maxLength={2}`).
- Padronizar feedback de submit com `<SubmitButton>` + spinner (`useFormStatus`).
- Melhorar layout desktop do `/cadastrar` (era `max-w-md` parecendo mobile esticado).

Cobertura de testes saiu de **50 → 130** (`+78`), incluindo casos negativos
(DV inválido, todos-iguais, formato errado, vazio).

## Problemas identificados (antes)

| # | Form | Problema |
|---|---|---|
| 1 | `/cadastrar` | CNPJ aceito por length; cidade/UF como string única `"Manhuaçu/MG"` |
| 2 | `/cadastrar` | Layout `max-w-md` — parece mobile esticado no desktop |
| 3 | `/cadastrar` | Falta campo WhatsApp pra corretora (canal principal de contato) |
| 4 | `/admin/aprovacoes` | UF digitado à mão; CNPJ sem máscara visual |
| 5 | `admin/corretoras` (form-fields shared) | CNPJ/phones sem máscara; UF como `<input maxLength={2}>` |
| 6 | `/onboarding/corretora` | CNPJ/phones sem máscara; UF/cidade livres |
| 7 | `/onboarding/produtor` | CPF/CNPJ/WhatsApp sem máscara; UF livre |
| 8 | `/painel/produtor/perfil` | Mesmas issues; campos texto livre |
| 9 | `/painel/corretora/perfil` | Phone sem máscara |
| 10 | `painel/corretora/compradores` | CNPJ/phone sem máscara; UF como `<Input maxLength={2}>` |
| 11 | `produtores/novo` + `contatos/[id]` | Phone sem máscara; UF livre |
| 12 | Server actions | Misturam normalização (`clean`, `cleanDigits`) com validação ad-hoc |
| 13 | Testes existentes | `admin/_lib/schemas.test.ts` usava CNPJ `12345678000190` (DV inválido); validação só por length permitia que passasse |

## O que foi feito (Fases A–G)

### A — Utils brasileiros (`apps/web/src/lib/brasil.ts`)

Funções puras:
- `onlyDigits`, `formatCPF/CNPJ/CpfOrCnpj/PhoneBR`
- `isValidCPF/CNPJ/CpfOrCnpj` com **DV1 + DV2** + rejeita todos-iguais
- `isValidPhoneBR` valida DDD 11-99, celular começa com 9, fixo começa 2-5
- `normalizeCPF/CNPJ/CpfOrCnpj` → digits-only
- `normalizePhoneBR` → `55DDDXXXXXXXX` (E.164 sem `+`)
- `UFS` (27 estados), `isValidUF`, `normalizeUF`
- `formatCityName`, `isValidCityName` (aceita acentos, hífen, apóstrofo;
  rejeita números, brackets, HTML-ish)
- `buildWhatsAppLink(phone, message)` retorna `null` se inválido
- `toWhatsAppE164` retorna `+55...`

### B — Schemas Zod (`apps/web/src/lib/brasil-schemas.ts`)

12 schemas reutilizáveis (versão obrigatória + opcional):

`cpfSchema`, `cnpjSchema`, `cpfOrCnpjSchema`, `phoneBRSchema`, `whatsappSchema`,
`ufSchema`, `citySchema` + `*OptionalSchema` correspondentes.

Cada schema **normaliza antes de validar** → retorna valor pronto pra
persistência. Mensagens em pt-BR ("Informe um CNPJ válido", "Selecione o
estado", etc.). Variantes `*Optional` aceitam vazio/null e devolvem `null`.

### C — Componentes (`apps/web/src/components/forms/`)

- **`<MaskedInput type={cpf|cnpj|cpf-cnpj|phone}>`** — client component.
  Controla state interno mascarado e submete valor **normalizado** via
  `<input type="hidden" name>`. Prop `validateOnBlur` marca borda destrutiva
  + `aria-invalid` quando DV inválido.
- **`<UfSelect>`** — `<select>` nativo com 27 UFs, submete uppercase.
- **`<FormField>`** — wrapper com `<Label>` + slot + erro/helper, conectados
  via `useId()`. `role="alert"` no erro, `aria-describedby` no helper.

### D — `/cadastrar` refatorado

- Layout `max-w-2xl` desktop, grid 2-col pros 4 campos pessoais em `md+`.
- Box corretora com grid 2-col: CNPJ + WhatsApp; grid `[1fr_8rem]`: cidade + UF.
- WhatsApp adicionado como **novo campo opcional** ("acelera contato dos produtores").
- LGPD checkbox `h-5 w-5` com `accent-milsaca-verde` + `text-sm` (era `text-xs`).
- `<SubmitButton>` com `useFormStatus` → "Enviando..." durante action.
- `_actions.ts` valida com `cnpjSchema`/`citySchema`/`ufSchema`/`whatsappOptionalSchema`;
  mensagens de erro **por campo** ao invés do genérico "Preencha: X, Y, Z".

### E1 — Admin (aprovações + corretora-form-fields)

- `admin/_lib/schemas.ts` agora re-exporta/usa schemas brasil:
  `corretoraSchema.cnpj` → `cnpjOptionalSchema` (DV check);
  `aprovarCorretoraSchema.cnpj` → `cnpjSchema`; `state` → `ufSchema/Optional`;
  `phone/telefone_fixo` → `phoneBROptionalSchema`.
- `/admin/aprovacoes`: `<MaskedInput type="cnpj">` + `<UfSelect>` (default MG).
- `corretora-form-fields.tsx` (shared "Nova" + "Editar"): CNPJ, phone,
  telefone_fixo via MaskedInput; state via UfSelect.
- **Migração `20260603000000_pending_signups_uf_whatsapp.sql`** — RPC
  `list_pending_corretora_signups` expandida com `corretora_uf` e
  `corretora_whatsapp` (DROP + CREATE porque PG não permite adicionar
  coluna ao return type). `packages/types/src/database.ts` sincronizado.
- Testes `admin/_lib/schemas.test.ts` migrados pra CNPJ `11222333000181`
  (DV válido) + caso negativo all-same. `smoke-aprovacao.mjs` idem.

### E2 — Onboarding

- `/onboarding/corretora`: MaskedInput em CNPJ/WhatsApp/telefone_fixo;
  UfSelect (default MG); SubmitButton. Action `completarOnboardingCorretora`
  reescrita com schemas Zod (rejeita CNPJ DV inválido, WhatsApp sem DDD).
- `/onboarding/produtor`: MaskedInput em cpf-cnpj/WhatsApp; UfSelect;
  SubmitButton. Action `completarOnboarding` reescrita com schemas Zod.

### E3 — Perfis

- `corretora/_lib/schemas.ts`: `perfilCorretoraSchema`, `compradorSchema`,
  `createProdutorContatoSchema` usam brasil-schemas (CNPJ DV, phone E.164,
  city, UF).
- `/painel/corretora/perfil`: MaskedInput phone + SubmitButton.
- `/painel/produtor/perfil`: MaskedInput cpf-cnpj/phone/whatsapp + UfSelect
  + SubmitButton. Action com helper `parseBrField` pra validação
  opcional consistente.

### E4 — Compradores + contatos sombra

- `compradores/_form.tsx`: MaskedInput CNPJ/contact_phone + UfSelect
  (em vez de `<Input maxLength={2}>` numa div flex com hack `w-20 uppercase`).
- `produtores/novo`: MaskedInput phone + UfSelect + SubmitButton.
- `produtores/contatos/[id]`: idem.
- `produtores/_actions.ts` reescrita pra usar `createProdutorContatoSchema`
  (eliminando código duplicado).

### F — Testes (`brasil.test.ts` + `brasil-schemas.test.ts`)

- **78 testes novos** (50 → 130).
- `brasil.test.ts` cobre: isValid* (positivo + DV errado + tamanho errado +
  todos-iguais + null/empty); format* progressivo; normalize*;
  telefones celular/fixo/DDI/DDD inválido; buildWhatsAppLink null-safety;
  UFs cobertura 27/27; city com caracteres especiais.
- `brasil-schemas.test.ts` cobre: cada schema obrigatório (válido + DV inválido
  + vazio falha) e seu opcional (vazio → null + preenchido inválido falha +
  preenchido válido normaliza).

### G — Este relatório

## Decisões importantes

### Não trocar npm por pnpm/yarn
Mantido `pnpm` pelo CLAUDE.md.

### Service role nunca no client
A migration `20260603` mantém RPC com `is_admin()` + `SECURITY DEFINER`,
não expõe service_role.

### Defesa em profundidade
UI envia valor já normalizado (via hidden input do MaskedInput) mas
**server re-valida com Zod**. Garante que requests fabricados externamente
não escapem o DV check.

### Schemas existentes integrados gradualmente
Os testes de `admin/_lib/schemas.test.ts` usavam CNPJ inválido `12345678000190`
desde o começo. Migrei junto pra `11222333000181` (DV correto) e atualizei
`smoke-aprovacao.mjs`. Outras suítes downstream não foram afetadas porque a
validação ficou *mais estrita*, não *quebrou interface*.

### MunicipioAutocomplete preservado
Onde já existia (admin/corretoras, onboarding/produtor), foi mantido em vez de
substituído pelo Input simples — autocomplete IBGE adiciona valor real.

## Cobertura de testes

```
Test Files  5 passed (5)
     Tests  130 passed (130)
```

| Arquivo | Antes | Depois |
|---|---|---|
| `admin/_lib/schemas.test.ts` | 24 | 26 |
| `lib/cotacao.test.ts` | * | * |
| `lib/auth.test.ts` | * | * |
| `lib/brasil.test.ts` | — | 49 (novo) |
| `lib/brasil-schemas.test.ts` | — | 29 (novo) |

Type-check: ✅  Lint: ✅  Vitest: ✅ 130/130

## Pendências assumidas

- **Autocomplete IBGE** no `/cadastrar` (cidade é input texto livre validado
  por `citySchema`). Pode entrar como Fase H com fetch a
  `https://servicodadosabertos.ibge.gov.br/api/v1/localidades/estados/{UF}/municipios`
  + debounce + cache. O onboarding já tem `<MunicipioAutocomplete>` pronto.
- **Máscara de CEP** (atualmente Input livre em corretora-form-fields e
  onboarding/corretora). Trivial — segue o mesmo padrão do MaskedInput
  pra `type="cep"`.
- **Recovery codes pra 2FA TOTP** — fora do escopo desta Fase mas continua
  pendente do Etapa 9 do plano original.
- **Migration aplicada em prod** — `20260603000000_pending_signups_uf_whatsapp.sql`
  precisa rodar quando o user fizer deploy. Compatível com versão antiga (RPC
  já existia; só adicionou colunas opcionais ao return).

## Arquivos novos

```
apps/web/src/lib/brasil.ts                                       (A)
apps/web/src/lib/brasil.test.ts                                  (F)
apps/web/src/lib/brasil-schemas.ts                               (B)
apps/web/src/lib/brasil-schemas.test.ts                          (F)
apps/web/src/components/forms/masked-input.tsx                   (C)
apps/web/src/components/forms/uf-select.tsx                      (C)
apps/web/src/components/forms/form-field.tsx                     (C)
supabase/migrations/20260603000000_pending_signups_uf_whatsapp.sql (E1)
docs/milsaca/plano-melhorias-campos-cadastro.md                  (plano original)
docs/milsaca/relatorio-melhorias-campos-cadastro.md              (este)
```

## Arquivos modificados

```
apps/web/src/app/cadastrar/_actions.ts                           (D)
apps/web/src/app/cadastrar/_components/cadastro-form.tsx         (D)
apps/web/src/app/cadastrar/page.tsx                              (D)
apps/web/src/app/admin/_lib/schemas.ts                           (E1)
apps/web/src/app/admin/_lib/schemas.test.ts                      (E1)
apps/web/src/app/admin/aprovacoes/page.tsx                       (E1)
apps/web/src/app/admin/corretoras/_components/corretora-form-fields.tsx (E1)
apps/web/src/app/onboarding/corretora/page.tsx                   (E2)
apps/web/src/app/onboarding/corretora/_actions.ts                (E2)
apps/web/src/app/onboarding/produtor/page.tsx                    (E2)
apps/web/src/app/onboarding/produtor/_actions.ts                 (E2)
apps/web/src/app/painel/corretora/_lib/schemas.ts                (E3)
apps/web/src/app/painel/corretora/perfil/page.tsx                (E3)
apps/web/src/app/painel/produtor/perfil/page.tsx                 (E3)
apps/web/src/app/painel/produtor/perfil/_actions.ts              (E3)
apps/web/src/app/painel/corretora/compradores/_form.tsx          (E4)
apps/web/src/app/painel/corretora/produtores/novo/page.tsx       (E4)
apps/web/src/app/painel/corretora/produtores/contatos/[id]/page.tsx (E4)
apps/web/src/app/painel/corretora/produtores/_actions.ts         (E4)
apps/web/scripts/smoke-aprovacao.mjs                             (E1)
packages/types/src/database.ts                                   (E1)
```

## Commits

```
e12aebb feat(cadastrar): MaskedInput CNPJ + UF separado + WhatsApp + layout 2-col (D)
550ee75 feat(forms): MaskedInput + UfSelect + brasil-schemas em 8 forms (E1-E4)
[pendente]  test(brasil): cobertura brasil.ts + brasil-schemas + relatório (F+G)
```
