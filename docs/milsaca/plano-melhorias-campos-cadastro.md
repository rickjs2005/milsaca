# Plano — Melhorias dos Campos de Cadastro

> Análise estática antes de mexer em código. Mapeamento dos formulários
> que precisam de máscaras de CPF/CNPJ/telefone, validação de dígito
> verificador, select de UF, e melhor layout desktop.

## 1. Formulários encontrados

| # | Arquivo | Campos relevantes | Onde usa |
|---|---|---|---|
| 1 | `apps/web/src/app/cadastrar/_components/cadastro-form.tsx` | `corretora_cnpj`, `corretora_city` (texto livre "Manhuaçu/MG") | Signup público |
| 2 | `apps/web/src/app/cadastrar/_actions.ts` | server action recebe `cnpj`, `city` | normaliza CNPJ via `cleanDigits` |
| 3 | `apps/web/src/app/onboarding/corretora/page.tsx` | `cnpj`, `phone`, `city`, `state`, `telefone_fixo` | Onboarding pós-signup |
| 4 | `apps/web/src/app/onboarding/produtor/page.tsx` | `cpf_cnpj`, `whatsapp`, `state`, `city` | Onboarding (já com IBGE autocomplete) |
| 5 | `apps/web/src/app/painel/corretora/perfil/page.tsx` | `phone` (operador) | Edição perfil corretora |
| 6 | `apps/web/src/app/painel/produtor/perfil/page.tsx` | `phone`, `whatsapp`, `cpf_cnpj`, `city`, `state` | Edição perfil produtor |
| 7 | `apps/web/src/app/painel/corretora/produtores/novo/page.tsx` | `phone`, `city`, `state` | Corretora cadastra contato sombra |
| 8 | `apps/web/src/app/painel/corretora/produtores/contatos/[id]/page.tsx` | `phone`, `city`, `state` | Edita contato sombra |
| 9 | `apps/web/src/app/painel/corretora/compradores/_form.tsx` | `cnpj`, `city`, `state` | CRUD compradores da corretora |
| 10 | `apps/web/src/app/admin/aprovacoes/page.tsx` | `cnpj`, `city`, `state` | Admin aprova corretora pendente |
| 11 | `apps/web/src/app/admin/corretoras/_components/corretora-form-fields.tsx` | `cnpj`, `state`, `city` (com `<MunicipioAutocomplete>`), `phone`, `telefone_fixo` | Admin CRUD corretora |

## 2. Problemas atuais

| Problema | Onde aparece |
|---|---|
| **CNPJ aceita qualquer coisa** — só `length === 14` após `cleanDigits`. Aceita `11111111111111`, `00000000000000` etc. | Todos com CNPJ |
| **CPF não validado** (não há cpf_cnpj com validação) | Produtor perfil/onboarding |
| **Telefone só normaliza length** — não há check de dígito | Todos |
| **Cidade texto livre + UF junto** ("Manhuaçu/MG") em `/cadastrar` | Apenas `/cadastrar`; outros já separam UF + autocomplete IBGE |
| **Layout `/cadastrar` mobile-only** — Card central estreito mesmo em desktop | `/cadastrar/page.tsx` (`max-w-md`) |
| **Sem máscara visual em CNPJ/CPF/telefone** — user precisa digitar `33.999.888/0001-00` à mão | Todos |
| **Checkbox LGPD pequeno e apertado** | `/cadastrar` |
| **Botão sem loading state** | `/cadastrar` ainda — outros já usam `<SubmitButton>` |

## 3. Padrão do backend (importante)

Análise de como cada campo é armazenado hoje:

| Campo | Tabela | Formato atual | Convergir pra |
|---|---|---|---|
| `corretoras.cnpj` | corretoras | dígitos apenas (`cleanDigits` em todas as actions) | manter dígitos |
| `compradores.cnpj` | compradores | dígitos apenas | manter dígitos |
| `produtores.cpf_cnpj` | produtores | texto livre (sem normalizador hoje) | **normalizar pra dígitos** |
| `corretoras.phone` | corretoras | texto livre — mistura `(33) 99999-9999`, `5533999999999`, `33999999999` | **normalizar pra `55DDDXXXXXXXX`** (E.164 sem `+`) |
| `produtores.whatsapp` | produtores | texto livre | mesmo padrão |
| `profiles.phone` | profiles | texto livre | mesmo padrão |
| `corretoras.telefone_fixo` | corretoras | texto livre | mesmo padrão |
| `produtores.phone` | profiles | texto livre | mesmo padrão |
| `compradores.contact_phone` | compradores | texto livre | mesmo padrão |
| `city` | várias | texto livre, IBGE-suggested em alguns | manter texto livre, mas trim + dedup espaços |
| `state` | várias | 2 letras uppercase em alguns, livre em outros | enforçar enum UF |

**Decisão**: armazenar tudo normalizado (dígitos pra docs, `55DDDXXXXXXXX` pra fone). Mais consistente, viabiliza `unique cnpj`, viabiliza `wa.me` direto sem re-normalizar.

**Risco**: dados existentes podem estar em formatos misturados. Migration de retroatividade fica como backlog (poucos registros hoje).

## 4. Plano de implementação

### Fase A — Utils (1 commit)
Criar `apps/web/src/lib/brasil.ts`:
- `onlyDigits(v)`
- `formatCPF(v)` / `isValidCPF(v)` / `normalizeCPF(v)`
- `formatCNPJ(v)` / `isValidCNPJ(v)` / `normalizeCNPJ(v)`
- `formatPhoneBR(v)` / `isValidPhoneBR(v)` / `normalizePhoneBR(v)` / `toWhatsAppE164(v)`
- `UFS` (lista) / `isValidUF(v)` / `normalizeUF(v)`
- `formatCityName(v)` / `isValidCityName(v)`
- Reexporta `buildWhatsAppLink(phone, message)` que valida antes

**Substitui:** `painel/corretora/produtores/_lib/whatsapp.ts` (manter o arquivo como re-export pra não quebrar imports).

### Fase B — Schemas Zod (1 commit)
Criar `apps/web/src/lib/brasil-schemas.ts`:
- `cpfSchema`, `cnpjSchema`, `phoneBRSchema`, `whatsappSchema`, `ufSchema`, `citySchema`

Atualizar:
- `admin/_lib/schemas.ts` → reusa `cnpjSchema`, `ufSchema`
- `painel/corretora/_lib/schemas.ts` → idem
- `cadastrar/_actions.ts` → valida CNPJ via `isValidCNPJ`

### Fase C — Componentes de input (1 commit)
Criar:
- `apps/web/src/components/forms/masked-input.tsx` — client component com `onChange` que aplica máscara
- `apps/web/src/components/forms/uf-select.tsx` — select com 27 UFs
- `apps/web/src/components/forms/form-field.tsx` — wrapper com Label + Input/Mascarado + erro (acessibilidade: aria-invalid, aria-describedby)

### Fase D — Tela /cadastrar (1 commit)
- Layout responsivo: `max-w-2xl` no desktop, card maior
- Grid 2 colunas pros dados da corretora em md+
- CNPJ com `<MaskedInput type="cnpj">`
- Cidade separada de UF: `<UfSelect>` + `<MunicipioAutocomplete>` (reusar)
- WhatsApp da corretora adicionado (novo campo)
- Checkbox LGPD maior e mais legível
- `<SubmitButton>` no lugar do botão atual

### Fase E — Outros formulários (1-2 commits)
Aplicar máscaras + UF select onde fizer sentido:
- onboarding corretora + produtor
- perfis corretora + produtor
- corretora cadastra/edita contato sombra
- compradores form
- admin aprovações (`<MaskedInput type="cnpj">` no `aprovacoes`)
- admin corretora form-fields (substituir `<input name="cnpj">` por mascarado)

### Fase F — Testes (1 commit)
`apps/web/src/lib/brasil.test.ts`:
- CPF: válido, inválido, todos iguais, com máscara, sem dígitos
- CNPJ: idem
- Telefone: 10/11/12/13 dígitos, com/sem máscara, com DDI 55
- WhatsApp link: válido/inválido
- UF: válida/inválida
- Cidade: com acento, com número rejeitado

### Fase G — Relatório (1 commit)
`docs/milsaca/relatorio-melhorias-campos-cadastro.md`

## 5. Riscos

| Risco | Mitigação |
|---|---|
| CNPJ inválido já gravado no banco | Migration retroativa fica fora; gates novos só impedem inserts novos |
| Phone normalizado quebra `wa.me` que esperava texto livre | `buildWhatsAppLink` aceita qualquer entrada (normaliza no momento) |
| Schemas Zod do admin/corretora quebram fluxo existente | Refac incremental: schemas novos chamam schemas antigos como base |
| Layout muda visualmente | Apenas `/cadastrar` ganha desktop melhorado; outros mantêm |
| `MaskedInput` precisa ser client component | Páginas server podem aninhar `<MaskedInput>` (já é o padrão usado pra `<MunicipioAutocomplete>`) |
| Onboarding produtor já tem UF + autocomplete IBGE — não quebrar | Reusar `<MunicipioAutocomplete>` sem mudar API |

## 6. Critérios de aceite (do prompt)

- [ ] CNPJ inválido não passa (DV checked)
- [ ] CPF inválido não passa (DV checked)
- [ ] Tel/WhatsApp sem DDD não passa
- [ ] Cidade não aceita número/script
- [ ] UF precisa ser válida (enum)
- [ ] CNPJ mostra `00.000.000/0000-00`
- [ ] CPF mostra `000.000.000-00`
- [ ] WhatsApp mostra `(00) 00000-0000`
- [ ] Desktop não parece mobile esticado em `/cadastrar`
- [ ] Mobile continua confortável
- [ ] Checkbox LGPD claro
- [ ] API recebe valores normalizados (dígitos pra docs, DDI 55 pra fone)
- [ ] Build verde
- [ ] Relatório final criado

## 7. Plano de commits

1. `docs(milsaca): plano de melhorias dos campos de cadastro`
2. `feat(utils): validações brasileiras (cpf, cnpj, telefone, uf, cidade)`
3. `feat(forms): componentes MaskedInput + UfSelect + FormField`
4. `feat(cadastro): aplicar máscaras + cidade/UF separados + layout 2 colunas desktop`
5. `feat(forms): aplicar máscaras em perfis e admin`
6. `test(utils): cobrir validações brasileiras`
7. `docs(milsaca): relatório de melhorias dos campos de cadastro`

## 8. Fora do escopo

- Migration retroativa de dados existentes (CNPJs/telefones em formato livre no banco) — backlog
- 2FA TOTP / step-up MFA — já entregue
- LGPD soft-delete adicional — já entregue
- Cobrança real — fora
- Mobile assets — fora
