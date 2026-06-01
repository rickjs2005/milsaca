# Auditoria de Coerência — Milsaca

**Data:** 2026-06-01
**Escopo:** monorepo `milsaca/` — `apps/web` (corretora + produtor + admin), `apps/mobile` (produtor), `packages/*`, `supabase/{functions,migrations}`.
**Método:** skill `milsaca-coherence-audit` — inventário (Fase 0) + 8 dimensões D1–D8 em paralelo (workflow, 9 agentes), auditando o **estado atual** do código (pós-correções A/B/C já no `main`).
**Módulos mapeados:**
- **web** — corretora (16 módulos), produtor (9), admin (panel), rotas públicas (laudos/[id]+pdf, contratos/[id]/verificar, c/[slug], lote/[id]).
- **mobile** — painel produtor (11 telas) + auth; `src/lib` (queries, auth, coffee, use-list, logger).
- **shared** — `packages/types` (database.ts gerado), `packages/db` (clients ssr/supabase-js), `packages/cob`, `packages/config-tailwind`.
- **backend** — edge functions Deno (`sync-cotacoes`, `send-dispatch`); 73 migrations. (Sem `server.js`/`app.js` — convenção não aplicável a esta stack.)

## ✅ Status de resolução (atualizado 2026-06-01)

**Todos os achados 🔴 e 🟡 resolvidos e no `main`; backlog 🔵 zerado salvo 4 itens adiados com motivo.**
Verificação em cada lote: web `type-check`/`lint` (0 warnings)/12 testes do logger/`next build`; mobile `type-check`/`lint`. Não validado em runtime atrás de auth.

| Achado | Status | Commit |
|---|---|---|
| 🔴 C1 — KPI cotação do produtor vazio | ✅ corrigido (lê por `specie`) | `3e215bb` |
| 🟡 I2 — `cancelado` do contrato vermelho→cinza | ✅ | `3e215bb` |
| 🟡 I3 — `coffeeLabel()` no web do produtor | ✅ | `3e215bb` |
| 🟡 I5 — gate Premium expirado (isProOrAbove exige assinatura utilizável) | ✅ | `3e215bb` |
| 🟡 I7 — `lead_status` labels por persona (fonte única) | ✅ | `3e215bb` |
| 🟡 I8 — `loadLeadsKpis` no `_lib` + `getCorretoraName` único | ✅ | `3e215bb` |
| 🟡 I1 — tabela de contratos | ⏸️ **decisão:** mantida (`tabela↔cards` = padrão do kit; regra "sem tabela" aplicada à superfície pública `/verificar`, já conforme) | — |
| 🟡 I4 — `database.ts` defasado | ✅ regen completo via MCP (15 tabelas + `price_alert`) + fallout de tipos | `72244a5` |
| 🔵 #1/#2/#10/#11 — status/coffeeLabel mobile | ✅ | `92e5719` |
| 🔵 #4 — `compradores/_form` → `_components` | ✅ | `92e5719` |
| 🔵 #5 — perfil `fmtDate` + tokens | ✅ | `92e5719` |
| 🔵 #7 — `ensureCorretora()` único | ✅ | `92e5719` |
| 🔵 #8 — `getProfile()` `.maybeSingle()` | ✅ | `92e5719` |
| 🔵 #12 — `proposta-meta` tokens + TONE | ✅ | `92e5719` |
| **bônus** — bug do command-palette (busca produtor por email inexistente) | ✅ revelado pela regen do I4; agora busca por nome/telefone | `9612b26` |

**⏸️ Adiados com motivo (não bloqueiam release):**
- **#3 grafia `conilon`/`conillon` no schema** — mexer em enum Postgres é arriscado; código já normaliza via `coffee.ts`. Consolidar exige migration cuidadosa.
- **#9 fonte serifada do certificado** — decisão de design (todos os outros elementos do certificado já conformes); precisa do dono confirmar se serifa é requisito ou atualizar o contrato pra Inter.
- **#13 migração total de tokens no mobile** — o CLAUDE.md declara a aplicação de tokens nas telas como "fase D2+"; é dívida planejada, não acidental.
- **#6 defesa-em-profundidade do produtor** — RLS já cobre; o padrão misto (uns refazem `.eq(produtor_id)`, outros confiam na RLS) é ambíguo, deixado como está.
- **Convenções emergentes a documentar:** esqueleto de tela mobile; tema claro da `cotacoes` mobile; perspectiva corretora×produtor de `lead_status`.

Histórico de commits da auditoria: `e04a343` (A) · `d2ccd98` (B+C) · `3e215bb` (correções) · `72244a5` (I4) · `9612b26` (command-palette) · `92e5719` (higiene).

---

> O diagnóstico original abaixo fica preservado como registro. Os achados marcados ✅ acima já não refletem o estado atual do código.

## Resumo executivo

O projeto está **coerente na fundação**: enums de status batem entre DB ↔ tipos ↔ duas UIs; tenancy `corretora_id` uniforme; clients Supabase centralizados em `@milsaca/db`; dono×operador e RLS consistentes; documento oficial (laudo PDF, certificado de contrato) com SHA-256 + QR. As correções A/B/C anteriores se confirmaram aplicadas.

**1 bloqueador crítico**, sobrevivente das correções anteriores: o **dashboard do produtor lê a cotação pela coluna/valor errado** (`coffee_type="arabica"` num campo que guarda `"Arábica"`) → o KPI principal do produtor fica permanentemente vazio. A Frente A corrigiu isso só no lado da corretora; o produtor ficou para trás.

O resto são incoerências de **manutenção/UX** (rótulos de status duplicados e divergentes, `coffee_type` exibido cru no web do produtor, tabela em contrato no desktop, tipos defasados) — nenhuma trava o release além do crítico. **Veredito: dá para fechar hoje após corrigir o 🔴 e, idealmente, os 🟡 de dado/UX (I3, I5).**

| Severidade | Qtd |
|------------|-----|
| 🔴 Crítico | 1 |
| 🟡 Importante | 8 |
| 🔵 Higiene | 13 |

## Achados críticos 🔴

### C1 — Dashboard do produtor: cotação filtrada por slug numa coluna que guarda label → KPI sempre vazio
- **Onde:** `apps/web/src/app/painel/produtor/page.tsx:50` (lê `.eq("coffee_type", "arabica")`) × `apps/web/src/app/painel/corretora/cotacoes/_actions.ts:79,145` (grava `coffee_type = COFFEE_TYPE_LABEL[specie]` = `"Arábica"`/`"Conillón"`).
- **O que diverge:** a cotação manual é **gravada** com o LABEL acentuado/capitalizado, mas o dashboard do produtor **lê** filtrando pelo SLUG minúsculo. `"Arábica" !== "arabica"` → o filtro nunca retorna linha. (`cotacoes` só é populada por entrada manual da corretora; o `sync-cotacoes` escreve em `market_quotes`, outra tabela.)
- **Padrão correto:** ler pela coluna canônica `specie` (enum slug), como **todo o resto da base** já faz — corretora `listCotacoes`/`loadCotacoesKpis` (após Frente A), produtor `laudos`, e mobile `listCotacoes`.
- **Impacto:** os KPIs-herói do produtor — "Cotação hoje" e "Valor do meu café" (estoque × cotação) — ficam em "—" mesmo havendo cotações cadastradas. Dado ausente na tela principal de um dos clientes, divergente do que a corretora vê. **Risco direto à percepção de valor do produto no piloto.**
- **Correção:** trocar `.eq("coffee_type", "arabica")` por `.eq("specie", "arabica")` em `loadResumo` (1 linha). Idealmente extrair `loadResumo` da page para um `produtor/.../_lib/queries.ts` para não reintroduzir o filtro divergente.

## Achados importantes 🟡

### I1 — Lista de contratos usa `<table>` no desktop (conflita com a regra 5 do contrato de coerência)
- **Onde:** `apps/web/src/app/painel/corretora/contratos/_components/contratos-view.tsx:187-280` (table no `lg:`; `ContratoCard` em cards já existe para `<lg`, linhas 328-370).
- **O que diverge:** a regra 5 da skill diz "UI de contrato **NUNCA** usa tabela — cards com cor por status". No desktop a listagem é uma `<table>`.
- **⚠️ Conflito a decidir (Rick):** o **kit do projeto** (`_Milsaca/19`, CLAUDE.md) estabelece "tabela↔cards" como padrão consistente de **todas** as telas-lista da corretora (lotes, entregas, pagamentos, ofertas…). Cumprir a regra 5 só em contratos faria a lista de contratos **divergir das telas-irmãs**. Ou seja: regra 5 (skill) × convenção emergente do kit colidem aqui. **Não corrijo sem sua decisão:** (a) contratos viram cards-only (cumprem regra 5, divergem do kit); (b) regra 5 vale só para a superfície **pública** (o certificado `/verificar` já é cards/sem-tabela) e a lista interna segue o kit. A página pública de verificação **já está conforme** (certificado, sem tabela).
- **Impacto:** se (a), manutenção dobrada hoje (tabela + card divergem em campos/formatação). Se (b), nenhuma mudança de código — só documentar a exceção.
- **Correção:** decisão de produto primeiro; depois ou trocar a `<table>` por grid de `ContratoCard` em todos os breakpoints, ou registrar a exceção da regra 5 no contrato.

### I2 — Cor do status `cancelado` do contrato diverge (vermelho vs cinza canônico)
- **Onde:** `contratos/_lib/contrato-meta.ts:28,36` (`cancelado: "danger"` → vermelho) × `components/status-badge.tsx:66` (mapa canônico `cancelado: "neutral"` → cinza, = regra 5 "Cancelado=cinza").
- **O que diverge:** mesmo status, duas cores no mesmo cliente. O canônico (e a regra 5) dizem cinza; `contrato-meta` pinta de vermelho (que o usuário lê como erro/rejeitado).
- **Padrão correto:** `cancelado` = `neutral`/cinza, alinhado ao `status-badge.tsx` e à regra 5.
- **Correção:** em `contrato-meta.ts`, `cancelado` → tone `neutral` + `bg-neutral-100 text-neutral-700`; idealmente derivar `CONTRATO_STATUS_TONE` do mapa canônico.

### I3 — `coffee_type` exibido cru (slug) nas telas web do produtor vs `coffeeLabel()` no mobile
- **Onde:** `painel/produtor/negociacoes/page.tsx:52,266`, `negociacoes/[id]/page.tsx:194`, `produtor/contratos/page.tsx:154`, `produtor/contratos/[id]/page.tsx:136` (renderizam `coffee_type` cru) × mobile `negociacoes.tsx:295`/`contratos.tsx:198` (usam `coffeeLabel`).
- **O que diverge:** após a migração para slug (Frente B), o web do produtor mostra `"arabica"` enquanto o mobile (e o próprio dashboard/cotações web, que já usam `coffeeLabel`/`SPECIE_LABEL`) mostra `"Arábica"`. Mesmo registro, rótulos diferentes entre os dois clientes do **mesmo** usuário.
- **Padrão correto:** envolver com `coffeeLabel()` de `@/lib/coffee` (já importado em telas irmãs).
- **Correção:** `coffeeLabel(coffee_type)` nas listas + detalhes de negociações e contratos do produtor web (e nas mensagens de WhatsApp montadas, p/ o texto bater entre clientes).

### I4 — `packages/types/database.ts` defasado (faltam ~14 tabelas + colunas/enums em uso)
- **Onde:** `packages/types/src/database.ts:537-586` (cotacoes sem `status`/`region_id`), `:1816-1822` (`notification_kind` sem `price_alert`); tabelas ausentes: `propostas`, `ofertas_comprador`, `platform_settings`, `coffee_types`, `pracas`, `price_alerts`, `corretora_invites`, etc.
- **O que diverge:** os tipos gerados não refletem o schema atual; queries a essas tabelas/colunas só compilam por cast manual (`as unknown as Row`), perdendo a rede de proteção. Cross-client: `price_alert` chega ao mobile e renderiza cru (`KIND_LABEL[...] ?? kind`, sem cor) porque o enum/labels não o conhecem.
- **Padrão correto:** `database.ts` reflete o schema corrente (fonte única dos dois clientes).
- **Correção:** `supabase gen types` + limpeza do lixo conhecido do CLI; trocar os `as unknown as Row` por tipos derivados; adicionar `price_alert` aos mapas de `notification_kind` (mobile + web). **Bloqueador parcial:** regen precisa de credencial do banco — tarefa à parte já conhecida (memória `feedback_supabase_gen_types_lixo`).

### I5 — Gate Premium: `detectCurrentTier` ignora `effectiveStatus` → Premium **expirado** mostra CTA que o backend rejeita
- **Onde:** `assinatura/_lib/plans-catalog.ts:150-165` (`detectCurrentTier` classifica por nome do plano, ignorando status), `_lib/plan-gate.ts:33` (`isProOrAbove`), `_lib/corretora.ts:146` (`isUsable` = trial|active), `contratos/page.tsx:48` × `contratos/_actions.ts:154`.
- **O que diverge:** a UI mostra o CTA "Novo contrato"/"Nova entrega" por `isProOrAbove` (true para Premium mesmo expirado/past_due/canceled), mas o backend (`requireActiveSubscription`) só permite `trial|active`. Premium vencido → vê o botão, clica, leva erro. (A Frente C alinhou o CTA a `isProOrAbove`, mas o furo é o próprio `isProOrAbove` para o caso expirado.)
- **Padrão correto:** UI e backend decidem igual "pode criar agora".
- **Correção:** `detectCurrentTier` tratar `effectiveStatus` expired/past_due/canceled como `gratuito` (rebaixa o tier quando a assinatura não é utilizável) **ou** as telas Pro-only gatearem por `subscription.isUsable`.

### I6 — Leitura de `cotacoes` alterna entre `coffee_type` e `specie` (causa-raiz do C1)
- **Onde:** `painel/produtor/page.tsx:48` (coffee_type) × `corretora/cotacoes/_lib/queries.ts:22`, `produtor/laudos/page.tsx:114`, `mobile/src/lib/queries.ts:101` (specie).
- **O que diverge:** `cotacoes` tem duas colunas de espécie — `coffee_type` (texto legado, guarda label) e `specie` (enum slug, canônica). A maioria lê por `specie`; só o dashboard do produtor lê por `coffee_type`.
- **Padrão correto:** toda leitura/escrita de espécie em `cotacoes` na coluna `specie` (slug). Depreciar/normalizar `coffee_type`.
- **Correção:** padronizar em `specie` (resolve C1 de raiz); avaliar parar de gravar/filtrar por `coffee_type` em `cotacoes`.

### I7 — `lead_status` com rótulos divergentes **dentro da mesma persona** (Perdido/Perdida, Recusado/Recusada, Novo/Nova, Convertido/Aceita)
- **Onde:** corretora `leads/_lib/lead-meta.ts:23-29` ("Perdido"/"Convertido") × `leads/_actions.ts:17-23` ("Perdida"/"Convertida", em notificações); produtor `negociacoes/_lib/queries.ts:14-20` ("Recusado"/"Convertido") × `produtor/page.tsx:318-322` ("Recusada"/"Aceita"); mobile `queries.ts:448`.
- **O que diverge:** o mesmo enum tem texto/gênero diferente em telas da **mesma** persona (a diferença corretora↔produtor é intencional; a interna não). Notificação "Lead marcado como Perdida" destoa da lista "Perdido".
- **Padrão correto:** um mapa por persona (`LEAD_STATUS_LABEL_CORRETORA` / `_PRODUTOR`, este compartilhado web+mobile), importado em todos os pontos.
- **Correção:** centralizar os labels por persona; remover os mapas inline em `_actions.ts` e `produtor/page.tsx`.

### I8 — KPI de leads inline na page + `loadCorretoraName` duplicado em 5 lugares
- **Onde:** `leads/page.tsx:34,100` (KPI query + nome da corretora inline) × demais módulos extraem para `_lib/queries` (`loadLotesKpis`, `loadContratosKpis`…); `loadCorretoraName`/`getCorretoraNome` repetido em `lotes/page.tsx:44`, `leads/page.tsx:100`, `assinatura/page.tsx:61`, `produtores/_lib/queries.ts:219`, `compradores/_lib/queries.ts:127` (com fallback divergente "Milsaca" vs null).
- **O que diverge:** `leads` quebra o padrão "sem query inline na page"; a busca do nome da corretora tem 5 cópias com contratos de retorno diferentes.
- **Padrão correto:** `loadLeadsKpis` em `leads/_lib/queries.ts`; um único `getCorretoraName(corretoraId)` em `_lib/corretora.ts`.
- **Correção:** mover o KPI de leads para o `_lib`; criar `getCorretoraName` único e substituir as 5 cópias.

## Achados de higiene 🔵

- `apps/mobile/app/(painel)/financeiro.tsx:26-42` — mapa de `pagamento_status` mobile não cobre `cancelado` (enum tem 4) — adicionar ou filtrar explicitamente.
- `apps/mobile/app/(painel)/laudos.tsx:187` — grafia `"Conilón"` (1 L) vs `"Conillón"` canônico — usar `coffeeLabel(r.lote?.specie)`.
- Schema com 3 grafias de espécie: `coffee_specie='conillon'` (lotes/cotacoes) × `produtor_specie='conilon'` × `coffee_types.species='conilon'` — mitigado por `coffeeSlug()` (`startsWith('conil')`), não resolvido. Consolidar grafia canônica num migration.
- `compradores/_form.tsx:15` — componente de form na raiz do módulo; mover para `_components/`.
- `perfil/page.tsx:58,73` — reinventa `formatDate` (usar `fmtDate` de `@/lib/format`) e usa tokens legados `emerald/rose/milsaca-verde` (usar `success/danger/milsaca-cafezal`).
- `produtor/{laudos,notificacoes}/page.tsx` confiam só na RLS enquanto `financeiro/entregas` refazem `.eq("produtor_id")` — padronizar defesa-em-profundidade (decisão de estilo, não furo de segurança).
- `ensureCorretora()` duplicado (entregas + compradores) e check inline em ~8 `_actions` — extrair único em `_lib/corretora.ts`.
- `apps/web/src/lib/auth.ts:42` usa `.single()` (lança em 0 linhas) vs mobile `.maybeSingle()` — alinhar para `.maybeSingle()`.
- `contratos/[id]/verificar/page.tsx` e `laudos/[id]/page.tsx` — certificado sem fonte **serifada** (rule 5 pede serifada; demais elementos do certificado OK). Confirmar se serifa é requisito firme ou atualizar o contrato (marca usa Inter).
- `pagamento_status='pendente'` rotulado "A pagar" (corretora) vs "Pendente" (produtor web+mobile) — mapas copiados; extrair label de produtor compartilhado web/mobile.
- `apps/mobile/app/(painel)/{financeiro,entregas}.tsx` — mapas de status com **hex literais** em vez de tokens; mover para `src/lib/queries.ts` ao lado de `LEAD/CONTRATO_STATUS_BADGE`.
- `propostas/_lib/proposta-meta.ts:37-43` — cores legadas (slate/sky/emerald/rose/amber) e sem `PROPOSTA_STATUS_TONE`, enquanto oferta/entrega/pagamento já migraram para tokens semânticos — espelhar `oferta-meta`.
- Mobile usa cores cruas (emerald/rose/amber/#hex) enquanto web migrou para tokens — **dívida planejada** (CLAUDE.md declara aplicação de tokens nas telas como "fase D2+"), não erro acidental.

## Convenções emergentes não documentadas

- **Esqueleto de tela mobile** (SafeAreaView `bg-milsaca-verde` + ScrollView `padding:24` + RefreshControl `#C9A961` + cards `rounded-2xl bg-milsaca-verde-claro`) — replicado consistente em 10 telas, mas não documentado nem extraído. Sugiro documentar no kit ou criar `<PainelScreen>`.
- **Tema claro da tela `cotacoes` mobile** (`bg-milsaca-cream`) diverge do tema escuro das outras 9 — provavelmente intencional (leitura densa de mercado). Confirmar e documentar, ou alinhar.
- **`lead_status` por perspectiva** (corretora "Perdido" × produtor "Recusado") — diferença legítima de persona; documentar o mapeamento para não ser confundido com bug.

## Plano de fechamento (hoje)

Um commit por concern (🔴 + 🟡). Sequência por impacto:

1. `fix(produtor): dashboard lê cotação por specie` — resolve **C1** + **I6** (padroniza leitura de `cotacoes` em `specie`; idealmente extrai `loadResumo` p/ `_lib`). **[1ª prioridade — dado errado na tela principal]**
2. `fix(produtor): coffeeLabel em negociações/contratos web` — resolve **I3**.
3. `fix(corretora): detectCurrentTier respeita effectiveStatus` — resolve **I5** (alinha gate UI×backend p/ Premium expirado).
4. `fix(contratos): cancelado=neutral + (decisão) cards-only na lista` — resolve **I2** e, **se aprovado**, **I1**.
5. `refactor(corretora): loadLeadsKpis + getCorretoraName no _lib` — resolve **I8**.
6. `refactor(labels): lead_status por persona em fonte única` — resolve **I7**.
7. `chore(types): regenerar database.ts + price_alert` — resolve **I4**. **[depende de credencial do banco]**

**Estimativa:** ~7 commits; 1–3 são triviais/rápidos; 4 depende de decisão; 7 depende de regen de tipos.

**Bloqueadores (precisam de você):**
- **I1 / regra 5 × kit:** decidir se contratos viram cards-only (diverge das telas-irmãs) ou se a regra 5 vale só para a superfície pública (`/verificar` já conforme). Sem isso, não toco na tabela.
- **I4 / regen de tipos:** precisa de `supabase gen types` com credencial do banco (+ limpeza do lixo do CLI) — tarefa à parte.

## Backlog (não-hoje)

Os 🔵 acima (consistência de tokens/labels no mobile, grafia `conilon/conillon`, serifa do certificado, `ensureCorretora` único, `.maybeSingle` no web, `compradores/_form` em `_components`, perfil tokens, defesa-em-profundidade uniforme) + documentar as 3 convenções emergentes. Nada bloqueia o release.
