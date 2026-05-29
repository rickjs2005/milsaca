---
title: Auditoria de Gaps de Produto por Persona — Milsaca
data: 2026-05-29
tipo: auditoria-produto
escopo: corretora · produtor · infraestrutura compartilhada
metodo: leitura de rotas/_actions/_lib/queries/migrations + verificação no banco remoto (MCP)
---

# Gaps de Produto por Persona — Milsaca

> Diagnóstico de **produto** (o trabalho da persona é atendido?), não de bugs.
> Evidência em `arquivo:linha`/rota. Severidade para **lançamento comercial**:
> 🔴 bloqueador · 🟠 importante · 🟡 desejável.

## ⚠️ Escopo do piloto (revisado 2026-05-29) — leia antes da lista

Decisões do dono que **filtram** a lista abaixo:

- **Web apenas** — app mobile engavetado. Os gaps **mobile (P1 push, P4 alvos
  mobile, P8 chat, I6 push)** saem da prioridade; o que importa do mobile é só a
  **responsividade do painel web**. Produtor também usa o **web** no piloto.
- **Pagamento produtor↔corretora FORA de escopo, por decisão** — feito direto
  entre eles; a Milsaca **não guarda dado bancário**. Some o gateway/PIX/boleto.
  Os gaps **C1, C4, P6, I3 (cobrança de repasse)** deixam de ser sobre dinheiro:
  no máximo viram **registro/controle** (a corretora anota "paguei", sem
  movimentar valor) — opcional, não bloqueador.
- **Assinatura:** corretora = **Premium único R$100/mês, 1º mês grátis**; produtor
  **grátis** agora (futura assinatura: dicas de manejo + cotação). Catálogo de
  planos a simplificar pra só Premium **quando for cobrar** (pós-piloto).
- **Piloto = 5 fundadoras grátis vitalício** (programa já existe no código) →
  **piloto não toca em cobrança**.

### O que SOBRA como prioridade real pro piloto web
1. 🔴 **SMTP/OTP** (I1) — login/onboarding. Único bloqueador "duro" que resta.
2. 🟠 **Responsividade do web** (corretora e produtor no navegador do celular).
3. 🟠 **Feed CEPEA no painel da corretora** (C2) — controle/precificação, esforço baixo.
4. 🟠 **Contraproposta** (P5) e **previsão/registro de pagamento como controle** (C1/P6 sem dinheiro) — se quiser fortalecer o "controle pra corretora".
5. 🟡 Resto (oferta ao comprador C3, cadastro CPF/CNPJ C5, equipe C6, EUDR) → pós-piloto/conforme feedback.

Notificações automáticas (worker WhatsApp/email I2) **deixam de ser 🔴 no web**:
no painel a notificação **in-app** já funciona e o contato com produtor é por
`wa.me` manual. Vira 🟠/pós-piloto.

---

## Veredito

O **núcleo transacional é forte e maduro** — classificação COB (IN 8/2003, real,
com laudo), contrato + espelho verificável (hash/QR), entrega/romaneio, propostas,
cotações de mercado, app do produtor com boa profundidade de leitura. Dá pra uma
corretora **operar o ciclo café** e o produtor acompanhar pelo celular.

Os gaps se concentram em **3 frentes**, e há um **buraco-raiz** que sozinho
destrava várias coisas:

1. 🔴 **Canal de saída (comms) não plugado** — é o buraco-raiz.
2. 🔴/🟠 **Loop financeiro incompleto** (faltam telas/controles, não dados).
3. 🟠 **Negociação e precificação pela metade**.

Para **piloto controlado** (plano atual): viável após os 🔴. Para **lançamento
comercial amplo**: somar os 🟠 (cobrança, negociação completa, captura de dados).

---

## ⭐ Buraco-raiz: nenhum canal externo está plugado (🔴)

Tudo abaixo colapsa num só esforço de fiação:
- **send-dispatch é stub** — `sendWhatsApp`/`sendEmail` lançam `*_not_implemented`
  (`supabase/functions/send-dispatch/index.ts:70,84`). A cadeia (fila
  `message_dispatches`, templates, `process_pending_dispatches`, cron, nudges) é
  **funcional** — morre só no worker.
- **SMTP transacional de produção pendente** — auth é OTP por email; sem SMTP
  próprio (Resend) o login/onboarding não escala. **É o bloqueador que afeta
  todos** (gate de cadastro/login). Esforço baixo (Management API).
- **Sem push mobile** — nenhum `expo-notifications` no app. Produtor
  WhatsApp-first só vê algo se abrir o app e puxar; **proposta com validade pode
  expirar sem ele ver**.

Resolver Resend + Meta WhatsApp Cloud + SMTP destrava: OTP/onboarding, alertas de
preço, digest diário de cotação, dunning de assinatura e alertas de operação —
de uma vez. A arquitetura já está pronta. **Maior retorno por esforço antes do go.**

---

## Persona: CORRETORA

**Coberto e maduro:** classificação COB (`@milsaca/cob`, IN 8/2003 completo, gera
laudo PDF + público), contrato/comissão/espelho verificável, entrega/romaneio
(peso bruto/tara/líquido, transportadora, parciais), propostas (compare-and-set),
analytics (KPIs/funil/comissão-ano), RLS multi-tenant.

| # | Gap | Sev | Esforço |
|---|-----|-----|---------|
| C1 | **Sem tela de pagamento ao produtor** — `produtor_pagamentos` existe completa, mas nenhuma rota `corretora/pagamentos`. O ciclo "entreguei→paguei→prestei contas" não tem UI. | 🔴 | médio |
| C2 | **Cotações ignoram o feed de mercado** — `cotacoes/page.tsx` só lê `cotacoes` manuais; `market_quotes` (CEPEA já no DB) não aparece no painel onde se precifica → precificação às cegas. | 🟠 | **baixo** |
| C3 | **Sem proposta/oferta ao COMPRADOR** — `propostas` só mira produtor (`lead_id`/`lote_id`); o lado cafeeira/comprador da intermediação vive fora do sistema. | 🟠 | médio |
| C4 | **Sem extrato/recebimento da comissão da corretora** — `comissao_total` é calculado mas não há "comissão a receber/recebida" nem baixa. A receita do negócio não é controlada. | 🟠 | médio |
| C5 | **Cadastro de produtor raso** — `produtores/novo` só coleta nome/contato/fazenda/cidade. Não captura CPF/CNPJ (sai "—" no espelho), nem CAR/polígono/certificações (colunas existem no banco, mas sem caminho de captura). | 🟠 | médio |
| C6 | **Sem gestão de operadores no painel** — convite de operador só pelo admin da plataforma; titular não convida/remove nem define permissões; todo operador faz tudo. | 🟠 | médio |
| C7 | **Sem assinatura eletrônica / distrato / aditivo** — "assinar" é mudar status; espelho tem linhas de assinatura manuais; renegociar invalida o hash sem versão. | 🟠 (e-sign) / 🟡 (aditivo) | alto / médio |
| C8 | **Comprador sem histórico de compras**; `compradores/[id]` só edita dados. | 🟡 | baixo |
| C9 | **Leads sem dono/distribuição** — sem `assigned_to`, sem round-robin (vira 🟠 quando houver equipe — C6). | 🟡 | médio |
| C10 | **Conferência de entrega não amarra reclassificação** nem gera divergência (sem integração balança/CT-e). | 🟡/🟠 | alto |
| C11 | **COB sem cupping SCA** (0–100) — café especial da Zona da Mata fica restrito ao commodity. | 🟡 | alto |

---

## Persona: PRODUTOR (WhatsApp-first, mobile)

**Coberto e bom:** onboarding com OTP, cotações (mercado + variação + sparkline +
NY→R$/saca via PTAX), ofertar café (vitrine), aceitar/rejeitar proposta, laudo COB,
entrega, financeiro (a receber/recebido), confiança (badge verificada + contagem).

| # | Gap | Sev | Esforço |
|---|-----|-----|---------|
| P1 | **Zero push** — app não avisa proativamente; proposta pode expirar sem ver. | 🔴 | médio |
| P2 | **Canal WhatsApp/Email não implementado** (worker stub) — alvo de preço e avisos não chegam no canal certo da persona. | 🔴 | alto (provider) |
| P3 | **Cotação diária prometida e nunca enviada** — `receber_cotacao_diaria` (default ON) gravado mas nenhum job lê. O gancho de retenção mais forte está morto. | 🟠 | médio |
| P4 | **Alvos de preço não existem no mobile** — CRUD só no web (que a persona não usa). | 🟠 | médio |
| P5 | **Sem contraproposta** — só aceita/rejeita; quem quer negociar preço cai no WhatsApp e perde o registro. | 🟠 | médio |
| P6 | **Sem previsão de pagamento** — só lista repasses já lançados; produtor não vê quanto/quando vai receber do contrato/entrega. | 🟠 | médio |
| P7 | **EUDR/polígono não coletado no app** — perfil mobile não captura polígono/CAR/CPF (colunas existem). Produtor é a fonte do polígono (GPS no campo). | 🟠 (sobe perto de 12/2026) | alto |
| P8 | **Comunicação 100% wa.me** — sem chat/histórico in-app; se não tem WhatsApp, botão falha em silêncio. | 🟡 | alto |
| P9 | **Laudo sem explicação** pro leigo ("Fora de tipo" em vermelho sem contexto gera desconfiança). | 🟡 | baixo |
| P10 | **Cotação da Home não personalizada** (primeiro número pode não ser o café/praça dele). | 🟡 | baixo |

---

## Infraestrutura compartilhada

| # | Módulo | Estado | Sev | Esforço |
|---|--------|--------|-----|---------|
| I1 | **SMTP transacional (OTP/login)** | pendente em prod | 🔴 | baixo |
| I2 | **Worker send-dispatch (WhatsApp Cloud + Resend)** | stub (fiação pronta) | 🔴 | médio |
| I3 | **Cobrança/assinatura** — sem gateway; ativação/renovação manual (`assinatura/page.tsx:128`). Trials/expiração por cron funcionam; dunning depende do worker. | manual funcional; auto inexistente | 🟠 | alto |
| I4 | **Cotações `sync-cotacoes`** — Arábica/Conilon/NY/PTAX OK, mas via **scraping** (frágil), **robusta desativado**, CEPEA oficial não contratado. | funcional mas frágil | 🟠 | médio |
| I5 | **WhatsApp** — só link `wa.me` + rastreio de clique; sem API oficial/automação. | funcional (lead-gen) | 🟠 | médio/alto |
| I6 | **Push mobile (Expo)** | inexistente | 🟡 | médio |
| I7 | **Fiscal NFP-e/NF-e** — `admin/fiscal` é placeholder; sem provider/CFOP/CST. | stub | 🟡 (🟠 se prometido) | alto |
| I8 | **EUDR/rastreabilidade** — colunas existem (jsonb), mas sem captura, sem PostGIS (geometry), sem DDS/TRACES. Página admin com comentário desatualizado. | dados parciais, fluxo inexistente | 🟡 (sobe 12/2026) | alto |
| I9 | **Motor de distribuição de leads** — `lead_distribution_rules` + `pick_eligible_corretora` têm CRUD admin mas **não são consumidos** em runtime (tabela órfã). | raso/órfão | 🟡 | médio |
| — | In-app notifications · Marketplace · Observabilidade admin | **funcionais** | ✅ | — |

---

## Prioridade consolidada (o que fazer antes do lançamento)

**Bloqueadores (🔴) — fazer antes de qualquer lançamento:**
1. **SMTP transacional** (I1) — gate de onboarding/login. Baixo esforço.
2. **Worker de comms + push** (I2, P1, P2) — sem isso o produto não alcança o
   produtor (a persona não abre o app sozinha). Médio esforço; destrava muito.
3. **Tela de pagamento ao produtor pela corretora** (C1) — o ciclo financeiro não
   tem UI apesar do banco pronto.

**Alto valor / baixo esforço (fazer logo):**
4. **Feed de mercado no painel da corretora** (C2) — fonte já existe; é exibir.
5. **Previsão de pagamento ao produtor** (P6) e **digest diário de cotação** (P3).

**Importantes para competir (🟠):**
6. Contraproposta (P5) + oferta ao comprador (C3) — fecha a negociação dos 2 lados.
7. Extrato de comissão (C4); cobrança via gateway (I3); captura de cadastro do
   produtor incl. CPF/CNPJ (C5); robustez das cotações (I4); gestão de equipe (C6).

**Compliance com prazo (🟡→🔴):**
8. EUDR — captura de polígono/CAR + PostGIS + DDS/TRACES (P7, C5, I8). Prazo
   30/12/2026; quanto mais cadastros sem polígono, maior o backfill.

**Desejáveis / diferenciação:** assinatura eletrônica (C7), cupping SCA (C11),
chat in-app (P8), explicação do laudo (P9), histórico do comprador (C8).
