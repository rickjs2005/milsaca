# MilSaca — Análise Estratégica e Regulatória

**Data:** 02/07/2026 · **Escopo:** análise, sem alteração de código · **Base:** código real do monorepo (`milsaca/`) + legislação vigente e em transição + pesquisa de mercado

---

## Sumário executivo

O MilSaca está numa janela regulatória rara. Três ondas chegam quase juntas — **EUDR (dez/2026)**, **Reforma Tributária (2026 = ano-teste, 2027 = cobrança real)** e **ANPD em modo fiscalização** — e nenhum concorrente direto de corretagem de café está preparado para elas. O núcleo transacional do MilSaca (lote → classificação COB → contrato → entrega → pagamento) já é exatamente a espinha dorsal que essas normas exigem que exista digitalizada. Os placeholders `admin/eudr` e `admin/fiscal` mostram que a direção já foi intuída; esta análise confirma que ela é a aposta certa e ordena a execução.

**Tese central:** o MilSaca não deve se vender como "CRM de corretagem", e sim como **a camada de conformidade e rastreabilidade da cadeia do café** — o sistema que faz a corretora continuar podendo vender café para quem exporta.

---

## 1. Novas normas e regulamentações

### 1.1 EUDR — Regulamento Antidesmatamento da UE ⚠️ *a mais impactante*

- **Status:** em vigor, aplicação escalonada após dois adiamentos: **grandes e médias empresas em 30/12/2026; micro e pequenas em 30/06/2027**.
- **O que exige:** prova de que o café não vem de área desmatada após 31/12/2020, com **geolocalização de cada talhão/gleba** (polígono ou ponto), due diligence documentada (DDS) e rastreabilidade lote a lote até a fazenda.
- **Contexto Brasil:** classificado como **risco padrão** (não baixo), o que mantém o nível cheio de verificação. Mais de 50% do café brasileiro vai para a Europa — quem não comprovar origem simplesmente perde o comprador.
- **Impacto no MilSaca:** o exportador vai empurrar a exigência para cima da cadeia: cooperativa → corretora → produtor. A corretora que não conseguir entregar o "pacote EUDR" do lote (geolocalização + documentos + cadeia de custódia) perde negócio para quem consegue. O MilSaca já tem `lotes`, laudo COB público com QR e colunas jsonb reservadas para EUDR — falta capturar geometria (PostGIS), documentos e gerar o dossiê.
- **Status normativo:** vigente, prazos confirmados; micro/pequenos ainda em transição até jun/2027. Regras de simplificação seguem em discussão em Bruxelas — acompanhar, mas **não** apostar em novo adiamento.

### 1.2 Reforma Tributária (CBS/IBS)

- **2026 é ano-teste:** desde 01/01/2026 os documentos fiscais eletrônicos devem **destacar CBS e IBS por operação** (notas técnicas da NF-e já publicadas); quem emite corretamente fica dispensado do recolhimento no período de adaptação, com dispensa de penalidades.
- **2027:** CBS passa a ser cobrada de fato (substituindo PIS/Cofins); transição do IBS até 2033.
- **Agro:** produtor com faturamento até **R$ 3,6 mi/ano fica isento** de IBS/CBS (pode não ser contribuinte); acima disso entra no regime. Simples Nacional decide até set/2026 como participa em 2027.
- **Corretora:** presta serviço de intermediação → emite **NFS-e de comissão**, que também migra para o padrão nacional com destaque (inicialmente facultativo) dos novos tributos.
- **Impacto no MilSaca:** cada contrato fechado na plataforma gera pelo menos dois eventos fiscais (NF-e da venda do café; NFS-e da comissão). Um módulo fiscal que emita/organize esses documentos amarrados ao contrato transforma uma dor recorrente em lock-in. O `admin/fiscal` placeholder confirma a intenção; hoje não há provider integrado.

### 1.3 MAPA e rastreabilidade vegetal

- **Decreto 12.709/2025:** novo regulamento de fiscalização de produtos de origem vegetal — incorpora **rastreabilidade, recall, análise de risco e programas de autocontrole** alinhados ao Codex Alimentarius. Tendência clara: a rastreabilidade deixa de ser diferencial e vira obrigação também no mercado interno.
- **Lei 9.972/2000 + IN 8/2003 (classificação COB):** classificação obrigatória na comercialização — **o MilSaca já cobre isso melhor que qualquer concorrente** com o `@milsaca/cob` e laudo público verificável.
- **Portaria SDA/MAPA 570/2022:** padrões para café torrado (vigente desde 2023) — afeta mais indústria que corretora, mas importa se compradores industriais entrarem no marketplace.

### 1.4 LGPD / ANPD

- A ANPD virou **agência reguladora com autonomia** (MP 1.317/25 convertida em lei em out/2025) e saiu da fase educativa: fiscalizações setoriais, painel público de monitoramento, multas de até 2% do faturamento (teto R$ 50 mi).
- **Mapa de Temas Prioritários 2026–2027** inclui **dados financeiros** e **inteligência artificial** — os dois no coração do MilSaca (extrato financeiro do produtor, futura IA).
- Regime simplificado para agentes de pequeno porte (< R$ 4,8 mi/ano): dispensa de DPO formal, prazos dobrados, registros simplificados — **desde que não haja tratamento de alto risco em larga escala**. À medida que o MilSaca escala nacionalmente, sai desse guarda-chuva.
- O MilSaca já tem base boa (consents, anonimização, export via `api/lgpd/exportar`, RLS por tenant) — acima da média do setor. Faltam: RIPD/relatório de impacto documentado, política de retenção formalizada e, quando houver IA, transparência sobre decisões automatizadas.

### 1.5 Documentos, assinatura e armazenamento

- **Assinatura eletrônica:** MP 2.200-2/2001 e Lei 14.063/2020 dão validade jurídica a assinaturas eletrônicas avançadas (não precisa ser ICP-Brasil para contratos privados, desde que haja prova de integridade e autoria). O hash + QR do contrato MilSaca é um bom começo, mas **não substitui assinatura eletrônica com trilha probatória** (IP, timestamp, autenticação do signatário) — gap C7 do backlog é real e urgente.
- **CPR (Cédula de Produto Rural):** desde a Lei 13.986/2020, CPRs devem ser **registradas em entidades registradoras autorizadas** (B3 etc.). Corretoras que intermedeiam CPR de café precisam desse trâmite — oportunidade de integração futura. *(Status: vigente; verificar recortes de obrigatoriedade por valor na implementação.)*

### 1.6 Certificações

- **Rainforest Alliance** (que absorveu a UTZ — o selo UTZ não existe mais separadamente), **Fairtrade**, **4C** e **C.A.F.E. Practices** dominam. Todas exigem **registro de volumes comprados/vendidos entre certificados** (ex.: plataforma MultiTrace da RA) — a cadeia de custódia é auditada.
- A própria Rainforest se posiciona como facilitadora de conformidade EUDR — sinal de que **certificação + EUDR convergem para o mesmo dado**: origem georreferenciada do lote.
- **Impacto:** corretora que intermedeia café certificado precisa controlar validade de certificados, saldos de volume certificado por produtor e não pode "misturar" lotes. Hoje o MilSaca não modela certificação.

### 1.7 Exportação e integrações oficiais

- Exportação exige: registro no SISCOMEX, Certificado de Origem (via CECAFÉ/entidades emissoras), certificado fitossanitário, e agora o dossiê EUDR. Corretoras raramente exportam diretamente, mas **alimentam quem exporta** — o valor do MilSaca é entregar o lote "export-ready".
- Integrações oficiais relevantes por ordem de prioridade: **SEFAZ (NF-e/NFS-e via provider)** > **consulta CAR/SICAR e PRODES/MapBiomas (verificação de desmatamento)** > **plataformas de certificadoras** > **TRACES/DDS da UE (via exportador)**.

---

## 2. Oportunidades de mercado (dores por segmento)

| Segmento | Dor criada pelas normas | O que compraria |
|---|---|---|
| **Pequenas corretoras** (1–3 pessoas, WhatsApp + caderno/Excel) | Não sabem nem por onde começar em EUDR/CBS; medo de perder compradores exportadores; nota de comissão feita manualmente | Um sistema que "resolve por elas": contrato + laudo + nota + dossiê do lote em 3 cliques. É o ICP atual do MilSaca |
| **Médias corretoras** (equipes, várias praças) | Volume torna controle manual inviável; compradores já pedem geolocalização; auditoria de comissões e permissões por corretor | Multiusuário com permissões, pipeline auditável, relatórios de conformidade, integração fiscal |
| **Grandes corretoras** | Já têm ERP genérico que não fala "café" (não faz COB, não faz EUDR); custo de compliance alto | API, integrações com seus sistemas, dossiê EUDR em lote, white-label da vitrine |
| **Cooperativas** | Milhares de cooperados micro/pequenos com prazo EUDR jun/2027; precisam coletar geolocalização e documentação em massa | Módulo de coleta em campo (mobile), gestão de certificados por cooperado, visão agregada de conformidade |
| **Exportadores** | Responsáveis legais pela DDS na UE; dependem da qualidade do dado que vem de baixo | Receber lotes já com dossiê padronizado; selo "lote verificado MilSaca" reduz custo de due diligence deles |

**Insight estratégico:** o exportador é o *enforcement* gratuito do MilSaca. Se 2–3 exportadores/compradores grandes passarem a **preferir lotes com dossiê MilSaca**, toda corretora e cooperativa da região é puxada para a plataforma. É o mesmo efeito de rede do lado comprador que o marketplace já persegue.

---

## 3. Funcionalidades recomendadas

Ordenadas por aderência ao que já existe no código:

1. **Dossiê EUDR do lote** (evolução do `admin/eudr` + jsonb já reservado): captura de geolocalização do talhão (ponto/polígono, PostGIS), vínculo CAR do produtor, checagem automática contra bases de desmatamento (MapBiomas Alerta/PRODES), geração de PDF/JSON do dossiê no padrão que o exportador anexa à DDS. **Benefício:** vira pré-requisito de venda para a Europa; ninguém no nicho oferece.
2. **Gestão documental por entidade** (extensão natural dos buckets existentes): documentos anexáveis a produtor/lote/contrato (CAR, ITR, procurações, certificados, notas), com validade, versão e visibilidade controlada por RLS. **Benefício:** centraliza o que hoje vive no WhatsApp; base para tudo (EUDR, fiscal, certificação).
3. **Assinatura eletrônica real** (gap C7): assinatura avançada com OTP/e-mail + carimbo de tempo + trilha probatória sobre o contrato já existente (hash/QR viram o mecanismo de verificação pública). Integração (Clicksign/ZapSign/D4Sign) ou nativa. **Benefício:** contrato deixa de ser "espelho" e vira título executável; elimina papel.
4. **Módulo fiscal** (`admin/fiscal` → produto): emissão de NFS-e de comissão da corretora via provider (Focus NF-e, NFE.io, eNotas…) amarrada ao contrato; apoio à NF-e do produtor (dados prontos para o contador); já no leiaute CBS/IBS 2026. **Benefício:** dor mensal recorrente de toda corretora PJ; ancora o plano pago.
5. **Gestão de certificados** (nova entidade): certificados por produtor/lote (RA, Fairtrade, 4C, orgânico), validade, volume certificado disponível, alerta de vencimento, e regra que impede vender lote "certificado" sem lastro. **Benefício:** cadeia de custódia exigida pelas certificadoras; prêmio de preço justifica o cuidado.
6. **Trilha de auditoria visível ao cliente** (o `audit_log` já existe): timeline imutável por contrato/lote ("quem alterou preço, quando"), exportável para auditoria. **Benefício:** transforma infra já construída em argumento de venda ("prova em disputa comercial").
7. **Alertas de vencimento e obrigações** (motor de notificações já existe; depende de destravar o worker `send-dispatch`): vencimento de certificado, contrato sem assinatura, entrega atrasada, prazo EUDR do produtor, obrigação fiscal do mês. **Benefício:** recorrência de uso diário — o sistema "puxa" o usuário de volta.
8. **Dashboard de conformidade** (Recharts já no stack): % de lotes com dossiê EUDR completo, produtores sem CAR, certificados a vencer, contratos sem assinatura. **Benefício:** o dono da corretora vê o risco em uma tela; vende sozinho na demo.
9. **Histórico de negociações** — já existe (leads → propostas → contratos). Evoluir para linha do tempo unificada por produtor/comprador com preço histórico vs. cotação do dia. **Benefício:** inteligência comercial e prova de melhor execução.
10. **Integrações**: WhatsApp Business API oficial (o pipeline `message_dispatches` está pronto, só falta o provider — **maior alavanca de curto prazo do produto**), provider fiscal, e-sign, CAR/SICAR, MapBiomas, gateway de cobrança (Stripe/Asaas — o código já prevê a troca do CTA).
11. **Automações**: follow-up de lead parado, cobrança de assinatura pendente, renovação de certificado, régua de dunning da mensalidade — todas já desenhadas em `automacoes-agentes.md`, bloqueadas pelo worker stub.

---

## 4. Diferenciais competitivos

**Cenário competitivo real (pesquisado):**

- **E-Corretagem** (corretagemdecafe.com.br): concorrente direto mais próximo — nicho café/cacau/pimenta, mas raso: cadastros, confirmação de negócio, relatórios; venda via WhatsApp; sem marketplace, sem COB digital, sem EUDR, sem fiscal, aparentemente operação de uma pessoa.
- **ERPs de indústria de café** (Alfa Networks, ADV, WebMais, EGE/SAP): focados em torrefação/indústria e armazéns — não modelam corretagem, comissão triangular nem o fluxo produtor-corretora.
- **Grão Direto** (grãos, não café): referência do que vem aí — marketplace com IA ("AIrton") para análise de mercado e automação de contratos. Se decidirem entrar em café, são a maior ameaça; o MilSaca precisa ocupar o nicho antes.
- **Planilha + WhatsApp:** o concorrente nº 1 de verdade na base do mercado.

**Onde o MilSaca já ganha de todos no nicho:**
1. **Classificação COB digital com laudo público verificável (QR)** — único no mercado; nenhum concorrente pesquisado tem.
2. **Marketplace de três lados** (produtor + corretora + comprador) com reputação gated por negociação real.
3. **Cadeia transacional completa** lote → laudo → contrato → romaneio → pagamento, multi-tenant com RLS.

**Onde ninguém está e o MilSaca pode chegar primeiro:** dossiê EUDR por lote, gestão de certificados com lastro de volume, fiscal CBS/IBS embutido no fluxo de corretagem. **Essa tríade é a fortaleza** — genéricos não conhecem café, e o nicho não tem musculatura técnica.

---

## 5. Inteligência Artificial (priorizada por retorno)

Hoje não há nenhuma IA no código — campo aberto. Prioridade por ROI:

| # | Caso de uso | ROI | Racional |
|---|---|---|---|
| 1 | **OCR/extração de documentos** (nota fiscal, CAR, certificado, romaneio → cadastro automático) | 💰💰💰 | Remove a maior fricção de onboarding e alimenta gestão documental/EUDR/fiscal. Custo baixo (LLM multimodal), valor imediato e demonstrável |
| 2 | **Copiloto de conformidade** ("o que falta neste lote para vender para exportador X?") | 💰💰💰 | Traduz regulação em ação; justifica plano premium sozinho. Dados já estão estruturados no banco |
| 3 | **Assistente de negociação/mercado** (resumo diário: ICE NY + PTAX + CEPEA já coletados + posições em aberto da corretora) | 💰💰 | Usa dados que o `sync-cotacoes` já traz; alto valor percebido, vira o "bom dia" do corretor |
| 4 | **Análise de contratos** (revisar minuta, apontar cláusulas faltantes vs. padrão do setor) | 💰💰 | Bom para médias/grandes; risco jurídico exige disclaimers |
| 5 | **Chatbot especializado no WhatsApp** (produtor consulta cotação, status do contrato, envia foto de documento) | 💰💰 | Poderoso, mas depende da WhatsApp API oficial (pré-requisito) |
| 6 | **Previsão de preços** | 💰 | Sedutor e arriscado: errar previsão em commodity destrói confiança. Fazer como "cenários e volatilidade", nunca como recomendação. Última prioridade |

**Atenção LGPD:** IA está no mapa de fiscalização da ANPD 2026-27 — decisões automatizadas precisam de transparência e revisão humana documentada desde o design.

---

## 6. Compliance interno (facilitar auditorias)

| Controle | Estado atual no código | Ação recomendada |
|---|---|---|
| Trilha de auditoria | ✅ `audit_log` + `log_audit` + `/admin/auditoria` | Expor ao cliente (por contrato/lote); garantir imutabilidade (revogar UPDATE/DELETE; considerar hash encadeado) |
| Logs de sistema | ✅ `system_events` + fila com reprocesso + Sentry | Definir retenção formal |
| Permissões | ⚠️ Roles grossos (produtor/corretora/admin) + `is_corretora_dono` | Permissões granulares por corretor (quem vê comissão, quem assina, quem cancela) — exigência de médias/grandes |
| Controle de usuários | ✅ Convites, aprovação, middleware; rota MFA existe | Tornar MFA obrigatório para donos de corretora e admins |
| Backups | ⚠️ Padrão Supabase (PITR depende do plano contratado) | Contratar PITR; documentar RPO/RTO; testar restore — auditor pergunta isso |
| Versionamento de registros | ⚠️ Só hash de contrato | Versionar contratos e documentos (nova versão a cada alteração, diff visível) |
| Criptografia | ✅ TLS + at-rest (Supabase) | Avaliar criptografia de coluna para dados bancários do produtor em `produtor_pagamentos` |
| LGPD | ✅ Consents, anonimização, export | RIPD documentado, política de retenção, DPA com subprocessadores (Supabase/Vercel/Sentry), nomear encarregado |

---

## 7. Roadmap

### Curto prazo (0–6 meses — até dez/2026, prazo EUDR)
*Tema: destravar o que está pronto e chegar ao prazo EUDR com produto.*
1. **Destravar o worker `send-dispatch`** (WhatsApp API oficial + Resend/e-mail) — pré-requisito de quase tudo: alertas, dunning, automações. Menor esforço/maior impacto do backlog.
2. **Gestão documental** (upload por produtor/lote/contrato com validade e versão).
3. **Dossiê EUDR v1**: geolocalização do talhão + CAR + documentos + PDF do dossiê. Marketing: *"Seu café pronto para a Europa antes de 30/12/2026"*.
4. **Assinatura eletrônica** via integração no contrato existente.
5. **Cobrança automática** (Stripe/Asaas — troca do CTA já prevista no código) + dunning pela fila de mensagens.
6. **Alertas de vencimento** sobre o motor de notificações.

### Médio prazo (6–18 meses)
*Tema: produtividade e receita por usuário.*
7. **Módulo fiscal** (NFS-e de comissão via provider, leiaute CBS/IBS; dados prontos para NF-e do produtor).
8. **OCR/IA documental** + **copiloto de conformidade**.
9. **Gestão de certificados** com lastro de volume.
10. **Dashboard de conformidade** + trilha de auditoria visível ao cliente.
11. **Permissões granulares + MFA obrigatório** (destrava médias corretoras).
12. **Dossiê EUDR v2**: checagem automática contra MapBiomas/PRODES; API para exportadores consumirem dossiês.

### Longo prazo (18+ meses)
*Tema: referência nacional e efeito de rede.*
13. **API pública + white-label** para grandes corretoras e cooperativas.
14. **Módulo cooperativa** (coleta de campo em massa via mobile — razão para desengavetar o app Expo).
15. **Assistente IA de mercado + chatbot WhatsApp** para o produtor.
16. **Selo "Lote Verificado MilSaca"** aceito por exportadores (o efeito de rede regulatório).
17. **Integrações financeiras** (CPR digital/B3, crédito lastreado em contratos da plataforma — com parceiro regulado).

---

## 8. Priorização (1–5: Impacto cliente / Complexidade / Valor comercial / Diferencial)

| Funcionalidade | Impacto | Complexidade | Valor | Diferencial | Nota |
|---|:-:|:-:|:-:|:-:|---|
| Worker de mensagens (WhatsApp/e-mail) | 5 | 2 | 5 | 2 | **Fazer primeiro** — desbloqueia 6 outras features |
| Dossiê EUDR | 5 | 3 | 5 | 5 | **Aposta estratégica** — janela até dez/2026 |
| Gestão documental | 5 | 2 | 4 | 3 | Fundação de EUDR, fiscal e certificados |
| Assinatura eletrônica | 4 | 2 | 4 | 3 | Via integração = rápido |
| Cobrança automática (Stripe/Asaas) | 3 | 2 | 5 | 1 | Higiene de negócio; MRR depende disso |
| Módulo fiscal NFS-e/CBS-IBS | 5 | 4 | 5 | 5 | Dor mensal universal; lock-in |
| OCR / IA documental | 4 | 3 | 4 | 4 | Melhor custo-benefício de IA |
| Gestão de certificados | 4 | 3 | 4 | 5 | Ninguém tem no nicho |
| Copiloto de conformidade (IA) | 4 | 3 | 5 | 5 | Premium natural |
| Dashboard de conformidade | 4 | 2 | 4 | 4 | Vende na demo |
| Permissões granulares + MFA | 3 | 3 | 4 | 2 | Destrava mid-market |
| Trilha de auditoria visível | 3 | 1 | 3 | 3 | Infra já existe |
| Alertas de vencimento | 4 | 1 | 3 | 2 | Depende do worker |
| API pública / white-label | 3 | 4 | 4 | 4 | Longo prazo, grandes contas |
| Chatbot WhatsApp produtor | 3 | 4 | 3 | 4 | Após API oficial |
| Previsão de preços (IA) | 2 | 5 | 2 | 3 | Adiar |

---

## 9. Modelo de negócio

Hoje: Gratuito / Premium R$ 100/mês (cobrança manual via WhatsApp). Proposta de escada:

- **Gratuito** — isca do marketplace (produtor sempre grátis; corretora limitada como hoje: 30 leads / 10 lotes).
- **Profissional (~R$ 149–199/mês)** — o plano atual renomeado: pipeline ilimitado, contratos + assinatura eletrônica, gestão documental, alertas, analytics.
- **Compliance (~R$ 349–499/mês)** — *o plano que a regulação vende:* dossiês EUDR, gestão de certificados, módulo fiscal (franquia de notas), dashboard de conformidade, trilha de auditoria exportável, permissões granulares, IA documental (franquia de páginas OCR).
- **Enterprise/Cooperativa (negociado)** — API, white-label, multiempresa (holding com várias corretoras — o modelo `corretora_id` suporta evoluir), coleta de campo, SLA, volumes de IA.
- **Add-ons com receita variável:** pacotes de notas fiscais, dossiês EUDR avulsos, assinaturas eletrônicas excedentes, créditos de IA — receita cresce com o uso, não só com o seat.

**Regra de ouro:** tudo que é obrigação legal recorrente (nota, dossiê, certificado) pertence a plano pago — churn baixíssimo, pois cancelar = voltar ao risco.

---

## 10. Relatório final

**Principais riscos regulatórios (para os clientes → oportunidades para o MilSaca):**
1. EUDR dez/2026–jun/2027: corretoras/cooperativas sem geolocalização e dossiê perdem acesso indireto ao mercado europeu (>50% do café BR).
2. Reforma tributária: 2026 é teste, 2027 é real — emissão errada de CBS/IBS vira passivo.
3. ANPD em modo sanção: dados financeiros e IA na mira 2026–27.
4. Decreto 12.709/2025: rastreabilidade e autocontrole também no mercado interno.
5. Risco próprio do MilSaca: crescer tratando dados financeiros de produtores sem RIPD/retenção formalizados.

**Oportunidades de crescimento:** ser o primeiro "compliance-in-a-box" do nicho café; cooperativas como canal de aquisição em massa (milhares de produtores de uma vez, prazo jun/2027); exportadores como enforcement do selo "lote verificado"; consolidar antes que um player de grãos com IA (perfil Grão Direto) entre no café.

**Funcionalidades prioritárias (ordem de execução):** 1) worker de mensagens; 2) gestão documental; 3) dossiê EUDR v1; 4) assinatura eletrônica; 5) cobrança automática; 6) módulo fiscal; 7) OCR/IA + copiloto de conformidade.

**Diferenciais que tornam o MilSaca difícil de substituir:** laudo COB digital público (único no mercado); histórico completo e auditável de anos de negociação (custo de migração altíssimo); dossiês EUDR e certificados acumulados por lote; efeito de rede de três lados; reputação verificada por transação real.

**Maior potencial de MRR:** módulo fiscal (dor mensal universal) > plano Compliance/EUDR (medo + prazo) > cobrança automática do plano atual (higiene imediata: hoje o billing manual limita qualquer escala) > add-ons de uso (IA, notas, dossiês) > Enterprise/cooperativas (ticket alto, ciclo longo).

**Recomendações estratégicas:**
1. **Reposicionar a narrativa:** de "CRM de corretagem" para "a plataforma que mantém sua corretora em conformidade e seu café vendável" — a regulação é o vendedor.
2. **Sequência técnica disciplinada:** worker de mensagens → documentos → EUDR → e-sign → billing → fiscal. Cada passo desbloqueia o seguinte; quase tudo aproveita infra já construída (fila, buckets, audit_log, placeholders).
3. **Campanha-prazo:** "30 de dezembro de 2026" como Y2K do café — conteúdo, webinars com cooperativas/sindicatos de Manhuaçu/Matas de Minas, checklist EUDR gratuito como isca de leads.
4. **Parceria com 1–2 exportadores** para validar o formato do dossiê e criar demanda puxada.
5. **Compliance interno como marketing:** publicar página de segurança/LGPD (RLS, auditoria, MFA, backups) — num produto que vende conformidade, a própria conformidade é prova social.

---

### Fontes principais
- EUDR prazos e impacto no café BR: [Agência Brasil](https://agenciabrasil.ebc.com.br/economia/noticia/2026-06/exigencias-regulatorias-da-ue-podem-embarreirar-pequenos-cafeicultores) · [Diário do Comércio](https://diariodocomercio.com.br/economia/eudr-cafe-brasil-exportacao/) · [ECCON](https://ecconsa.com.br/cna121/)
- Reforma tributária 2026: [Receita Federal — Orientações 2026](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-consumo/orientacoes-2026) · [Senado](https://www12.senado.leg.br/noticias/materias/2026/01/02/ano-de-2026-marca-implementacao-da-reforma-tributaria) · [Portal NF-e — Adequações](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=YmYqYBW8gGQ%3D)
- MAPA: [Decreto 12.709/2025](https://www.gov.br/agricultura/pt-br/assuntos/noticias/2025/novo-regulamento-moderniza-fiscalizacao-de-produtos-de-origem-vegetal) · [ABIC — legislação do café](https://www.abic.com.br/institucional/legislacao/)
- LGPD/ANPD: [fiscalização temática 2025-26](https://confidata.com.br/blog/fiscalizacao-tematica-anpd-2025-2026) · [ANPD agência reguladora e multas](https://minottocontabilidade.com.br/anpd-fiscalizacao-2026-pme-multas-lgpd/)
- Certificações/rastreabilidade: [Rainforest Alliance — EUDR](https://www.rainforest-alliance.org/pt-br/business-pt-br/certificacao/como-a-rainforest-alliance-apoia-a-conformidade-com-o-eudr-da-fazenda-ao-varejista/) · [MultiTrace](https://www.rainforest-alliance.org/pt-br/business-pt-br/certificacao/entendendo-a-rastreabilidade-de-ponta-a-ponta-para-cacau-e-a-plataforma-multitrace/)
- Concorrência: [E-Corretagem](https://corretagemdecafe.com.br/) · [Grão Direto + IA](https://www.agrolink.com.br/noticias/tecnologia-e-agro--inteligencia-artificial-revoluciona-a-venda-e-compra-de-graos-no-brasil_492247.html)
