# MilSaca — Plano de Implementação: Curto Prazo (jul–dez/2026)

**Data:** 02/07/2026 · **Horizonte:** ~24 semanas (até o prazo EUDR de 30/12/2026) · **Origem:** `analise-estrategica-regulatoria-2026-07.md`

**Premissa de capacidade:** 1 dev full-time (ajustar datas proporcionalmente se houver mais gente). As fases têm sobreposição planejada: enquanto uma espera aprovação externa (Meta, provider fiscal, e-sign), a seguinte começa.

---

## Visão geral e dependências

```
F0 Mensageria (sem 1–3)  ──────┬──> F5 Alertas de vencimento (sem 11–13)
F1 Gestão documental (sem 2–6) ─┤──> F2 Dossiê EUDR v1 (sem 5–11)
F3 Assinatura eletrônica (sem 7–10)   [depende de F0 p/ notificar signatário]
F4 Cobrança automática (sem 9–13)     [depende de F0 p/ dunning]
Sem 14–24: buffer, hardening, campanha EUDR, onboarding de clientes
```

Racional da ordem: **F0 destrava tudo** (alertas, dunning, e-sign notifica por WhatsApp/e-mail); **F1 é fundação do F2** (dossiê EUDR é, em grande parte, documentos + geolocalização); F3/F4 são independentes entre si e encaixam nos períodos de espera de aprovações externas.

---

## F0 — Ligar a mensageria (WhatsApp + e-mail) · semanas 1–3

**Descoberta importante:** os providers **já estão codados** em `supabase/functions/send-dispatch/index.ts` (WhatsApp Cloud API + Resend). O modo stub é só ausência de secrets. Porém há um gap técnico real: o worker envia `type: "text"`, e a Cloud API **só permite texto livre dentro da janela de 24h** após mensagem do usuário. Notificações iniciadas pela plataforma (o caso do MilSaca) exigem **templates pré-aprovados pela Meta (HSM)**.

### Tarefas

1. **Provisionamento (semana 1, maioria é espera externa — iniciar já):**
   - Meta: verificar o negócio no Business Manager, criar app WhatsApp Business Platform, número dedicado (não pode ser o número pessoal já usado em `wa.me`), gerar `WHATSAPP_PROVIDER_TOKEN` + `WHATSAPP_PHONE_ID`.
   - Submeter à aprovação os templates Meta espelhando os `notification_templates` existentes (categoria *utility*: proposta recebida, contrato criado, pagamento registrado, amostra vinculada, etc.). Aprovação leva de horas a dias.
   - Resend: verificar domínio (SPF/DKIM/DMARC), `RESEND_API_KEY` + `RESEND_FROM`.
   - **SMTP transacional do Supabase Auth (gap I1):** apontar para o SMTP do Resend — resolve OTP/confirmação de e-mail em produção no mesmo passo.
2. **Código (semana 2):**
   - Adaptar `sendWhatsApp()` para `type: "template"` (name + components com as variáveis), mantendo `type: "text"` como fallback dentro de janela de sessão. Mapear `notification_templates.kind` → nome do template Meta (coluna nova `meta_template_name` em `notification_templates`).
   - Migration para a coluna + seed dos nomes.
3. **Ativação (semana 2–3):**
   - Secrets no Supabase (`SEND_DISPATCH_SECRET`, tokens), `supabase functions deploy send-dispatch --no-verify-jwt`, configurar `dispatch_worker_url` + `dispatch_worker_secret` em `/admin/configuracoes` (sai do modo stub do cron `process_pending_dispatches`).
   - **Rollout controlado:** antes de ligar, revisar a fila — há despachos acumulados em `pending`; decidir política (provavelmente expirar os antigos em vez de metralhar os usuários no dia 1). Ligar primeiro só e-mail, depois WhatsApp para as 5 corretoras fundadoras, depois geral.
   - Opt-out: garantir que preferências de canal por usuário existam (mínimo: flag no perfil) — exigência LGPD/boas práticas Meta (qualidade do número cai com bloqueios).

### Critérios de aceite
- OTP/e-mails de auth chegam em produção; despacho de teste WhatsApp e e-mail com status `sent` em `message_dispatches`; falha de template vira `failed` com motivo; painel `/admin/fila-eventos` sem acúmulo; taxa de qualidade do número Meta ≥ verde após 1 semana.

### Custos
Meta: ~US$ 0,008–0,04/conversa utility no BR (barato no volume atual). Resend: free tier 3k e-mails/mês cobre o início.

---

## F1 — Gestão documental · semanas 2–6

Fundação para EUDR, fiscal e certificados. Segue o molde já validado do bucket `comprovantes` (migration `20260711000000_comprovantes_storage.sql`: bucket privado, path `{corretora_id}/...`, RLS por segmento de path, signed URLs no server).

### Modelagem (migrations novas)

- Tabela `documentos`: `id`, `corretora_id`, `owner_kind` (enum: `produtor` | `lote` | `contrato` | `corretora`), `owner_id uuid`, `categoria` (enum: `car` | `itr` | `procuracao` | `certificado` | `nota_fiscal` | `contrato_assinado` | `outro`), `titulo`, `storage_path`, `mime_type`, `tamanho_bytes`, `valido_ate date null`, `versao int` + `substitui_documento_id uuid null` (versionamento por encadeamento, nunca sobrescrever), `uploaded_by`, timestamps, soft-delete.
- Bucket privado `documentos`, path `{corretora_id}/{documento_id}.{ext}`; policies copiadas do padrão `comprovantes` (corretora CRUD no próprio tenant, produtor SELECT nos docs vinculados a ele, admin tudo).
- RLS na tabela pelo padrão do projeto (`current_corretora()`, `is_admin()`); produtor vê documentos onde `owner_kind='produtor' and owner_id = <seu produtor>` ou de seus lotes/contratos.
- `log_audit` em INSERT/UPDATE/DELETE (documentos são exatamente o tipo de mutação sensível que a trilha existe para cobrir).

### UI

- Componente reutilizável `DocumentosSection` (lista + upload + badge de validade) plugado nas telas de detalhe existentes: produtor, lote, contrato (`painel/corretora/...`), seguindo a convenção `_actions.ts`/`_lib`/`_components`.
- Painel do produtor: aba "Meus documentos" (upload de CAR/ITR pelo próprio produtor — reduz trabalho da corretora e prepara o mutirão EUDR).
- Validações: MIME allowlist (pdf/jpg/png), limite ~10 MB, contagem por plano (gate no plano Gratuito).

### Critérios de aceite
- Upload/download/troca de versão funcionando nos 3 contextos; produtor de outra corretora não acessa (teste de RLS); documento com `valido_ate` vencido exibe badge; auditoria registra quem subiu/removeu.

---

## F2 — Dossiê EUDR v1 · semanas 5–11 ⭐ *aposta estratégica*

Escopo v1 = **captura de origem + dossiê verificável**. Checagem automática contra MapBiomas/PRODES fica para v2 (médio prazo) — não bloqueia o valor: o que o exportador precisa receber é geolocalização + documentação organizada.

### Modelagem

- Habilitar **PostGIS** no Supabase (extensão suportada).
- Tabela `talhoes`: `id`, `produtor_id`, `corretora_id`, `nome`, `geom geometry(Geometry, 4326)` (aceita `Point` para ≤4 ha — permitido pelo EUDR — e `Polygon` acima disso), `area_ha`, `car_numero` (herdável do produtor), timestamps. RLS padrão.
- `produtores`: colunas `car_numero`, `cpf_cnpj` (se ainda não houver — necessário no dossiê).
- `lotes`: tabela de junção `lote_talhoes` (um lote pode misturar talhões; a rastreabilidade exige saber quais).
- Aproveitar as colunas jsonb EUDR já reservadas para metadados flexíveis (declarações, respostas do produtor).

### Captura de geolocalização (o problema real é operacional, não técnico)

Três vias, todas no v1:
1. **Mapa interativo** (react-leaflet já está no stack): corretora/produtor marca ponto ou desenha polígono na tela do talhão.
2. **Upload de arquivo** GeoJSON/KML (produtores maiores já têm do CAR/agrônomo) → parse e validação no server action.
3. **"Estou na lavoura"** (web mobile): botão que captura `navigator.geolocation` como ponto — o caminho de menor atrito para o pequeno produtor.

### Dossiê e verificação

- Função `eudr_checklist(lote_id)` (SQL ou server action): retorna itens ✅/❌ — talhão(ões) com geometria, CAR presente, documento CAR anexado (F1), CPF/CNPJ do produtor, datas de colheita/safra. É a fonte do dashboard e do gate "gerar dossiê".
- **PDF do dossiê** com `@react-pdf/renderer` (mesmo padrão do laudo COB): identificação do lote, produtor, talhões (mini-mapa estático + coordenadas/GeoJSON impresso), documentos anexos referenciados, hash de conteúdo + QR → página pública `/eudr/[id]/verificar` (mesmo padrão de `/contratos/[id]/verificar` e `/laudos/[id]`).
- **Export JSON** com o GeoJSON dos talhões no formato que o exportador cola na DDS (TRACES aceita GeoJSON) — diferencial prático imediato.
- Transformar `admin/eudr` (placeholder) em visão da plataforma: % de lotes/produtores conformes por corretora.
- Na corretora: card "Conformidade EUDR" no dashboard + filtro "lote com/sem dossiê" na lista de lotes.

### LGPD (não pular)
Geolocalização de propriedade + CPF são dados pessoais novos: atualizar `/politica-privacidade`, registrar finalidade em `lgpd_consents` no fluxo de captura, incluir no export LGPD existente.

### Critérios de aceite
- Lote com 2 talhões (1 ponto + 1 polígono importado de KML) gera dossiê PDF + JSON verificáveis pelo QR; checklist reflete pendências em tempo real; produtor consegue marcar talhão pelo celular; teste com 1 exportador/comprador real validando o formato (meta: 1 parceiro até semana 16).

---

## F3 — Assinatura eletrônica · semanas 7–10

**Decisão recomendada: integrar provider brasileiro, não construir.** Assinatura própria exigiria trilha probatória (IP, timestamp, autenticação) juridicamente defensável — custo alto para reinventar o que custa centavos por envelope. Candidatos: **ZapSign** (mais barato, assinatura via WhatsApp — combina com o público) ou **Clicksign** (mais estabelecida). Ambas atendem MP 2.200-2/2001 (assinatura eletrônica avançada, válida para contratos privados).

### Fluxo

1. Contrato criado (fluxo atual em `painel/corretora/contratos`) → botão "Enviar para assinatura".
2. Server action gera o PDF do contrato (renderer já existe para o espelho), envia à API do provider com os signatários (corretora + produtor + comprador quando aplicável, e-mail/WhatsApp de cada um).
3. Provider notifica signatários; **webhook** `apps/web/src/app/api/webhooks/esign/route.ts` (rota nova — validar assinatura HMAC do provider) recebe eventos: visualizado, assinado, concluído, recusado.
4. Ao concluir: baixar o PDF assinado + relatório de evidências → salvar como `documentos` (`categoria='contrato_assinado'`, F1), preencher `signed_at`, recalcular/registrar hash. A página pública `/contratos/[id]/verificar` passa a mostrar também o status da assinatura.
5. Estados novos no contrato: `aguardando_assinatura`, `parcialmente_assinado`, `assinado`, `recusado` (enum existente de status de contrato ganha valores ou tabela satélite `contrato_assinaturas` — preferir satélite para não mexer no enum em produção).

### Integração com o resto
- Notificação de "contrato aguardando sua assinatura" via fila `message_dispatches` (F0) com lembrete em 48h (semente do F5).
- Gate de plano: e-sign só no plano pago (já há infra de gate no middleware).

### Critérios de aceite
- Contrato de teste assinado pelas 3 partes com PDF final + evidências arquivados e verificáveis; recusa e reenvio funcionam; webhook idempotente (evento duplicado não corrompe estado).

### Custos
ZapSign ~R$ 0,80–2/documento em planos de volume; repassável no preço do plano.

---

## F4 — Cobrança automática · semanas 9–13

**Decisão recomendada: Asaas** (o comentário no código já previa "Stripe/Asaas"). Justificativa: público é PJ pequena do interior de MG — **Pix e boleto recorrentes são obrigatórios**, cartão é secundário; Asaas resolve os três nativamente com API simples e webhook. Stripe fica como alternativa se o cartão dominar.

### Tarefas

1. Conta Asaas PJ + sandbox; assinaturas recorrentes (R$ 100/mês, 1º mês grátis = trial atual).
2. Trocar o CTA `whatsappLinkForUpgrade` em `painel/corretora/assinatura` por checkout: server action cria cliente + assinatura no Asaas e redireciona para a fatura/checkout.
3. Webhook `api/webhooks/billing/route.ts`: `PAYMENT_CONFIRMED` → chama o RPC existente `mark_subscription_paid` (migration `20260624...`); `PAYMENT_OVERDUE` → inicia régua de dunning; validar token do webhook.
4. **Dunning via F0:** D-3 (fatura chega), D0 (vence hoje), D+3 e D+7 (lembretes), D+10 (aviso de bloqueio) — o gate de expiração no middleware e os crons `expire_trials`/`expire_subscriptions` já existem; o dunning só preenche a comunicação que faltava.
5. `/admin/assinaturas`: coluna de status Asaas + conciliação manual (link para fatura); manter `mark_subscription_paid` manual como fallback (cliente que paga por fora).
6. Migrar as assinantes atuais ativadas manualmente (poucas — fazer à mão com acompanhamento).

### Critérios de aceite
- Corretora nova: trial → fatura automática → pagamento Pix confirma plano sem toque humano; inadimplência dispara régua e bloqueia no prazo; admin vê tudo conciliado; assinantes antigas migradas sem interrupção.

---

## F5 — Alertas de vencimento e obrigações · semanas 11–13

Camada fina sobre F0+F1: um cron (pg_cron, padrão já usado no projeto) `enqueue_expiry_alerts()` que roda 1×/dia e enfileira em `message_dispatches`:

| Alerta | Fonte | Antecedência |
|---|---|---|
| Documento vencendo (CAR, certificado, procuração) | `documentos.valido_ate` (F1) | 30/7/0 dias |
| Contrato aguardando assinatura | estados F3 | 48h, depois semanal |
| Entrega prevista sem romaneio | `entregas` | no dia |
| Dossiê EUDR incompleto p/ lote em negociação | `eudr_checklist` (F2) | ao criar proposta |
| Trial/assinatura vencendo | `subscriptions` | régua F4 |

- Tabela `alert_log` (ou reuso de `system_events`) para **não repetir** alerta já enviado na mesma janela.
- Preferências por usuário (canal e tipos) — página em perfil; default conservador.
- Dashboard: card "Pendências" no painel da corretora somando alertas ativos.

### Critérios de aceite
- Nenhum alerta duplicado em execuções consecutivas do cron; opt-out respeitado; documento com validade em 30 dias gera WhatsApp/e-mail correto.

---

## Semanas 14–24 — Buffer, hardening e go-to-market

Reserva deliberada (~40% do calendário) para: atraso de aprovações externas (Meta, Asaas, e-sign), bugs de produção do rollout, e principalmente **a campanha EUDR** — o software pronto em outubro sem clientes não cumpre a meta:

- **Semana 14–16:** validar formato do dossiê com 1–2 exportadores/compradores; ajustar.
- **Semana 15+:** campanha "30/12/2026" — checklist EUDR gratuito como isca (landing já no domínio), webinar com sindicato/cooperativa de Manhuaçu, conteúdo para as corretoras fundadoras distribuírem.
- **Mutirão de captura:** meta operacional de X produtores com talhão georreferenciado até dez (definir X com as fundadoras; é a métrica-norte do semestre).
- Hardening: teste de restore do backup (contratar PITR), revisão de RLS das tabelas novas (`documentos`, `talhoes`, `lote_talhoes`, `contrato_assinaturas`), atualização do RIPD/política de privacidade, MFA obrigatório para donos de corretora.

---

## Riscos e mitigações

| Risco | Prob. | Mitigação |
|---|---|---|
| Aprovação Meta (verificação de negócio/templates) atrasar semanas | Alta | Iniciar na semana 1; e-mail entra primeiro; `wa.me` continua como fallback |
| Produtores não fornecerem geolocalização (adoção, não tecnologia) | Alta | Botão "estou na lavoura", mutirão com corretoras/cooperativa, campanha-prazo |
| Ligar mensageria e disparar backlog de despachos antigos | Média | Expirar fila `pending` antiga antes do go-live; rollout por corretora |
| Simplificação/adiamento do EUDR mudar exigências | Média | v1 captura o dado bruto (geo + docs), que serve a qualquer formato final; acompanhar atos delegados |
| Dev solo: 6 fases em 24 semanas | Média | Buffer de 10 semanas; cortar na ordem inversa (F5 é a mais sacrificável; F0–F2 nunca) |
| Webhooks (e-sign, billing) sem idempotência geram estado corrompido | Média | Chave de idempotência por evento + testes de replay desde o início |

## Resumo de decisões a tomar (bloqueiam início de fase)

1. **Provider e-sign:** ZapSign vs Clicksign (recomendação: ZapSign, pela assinatura via WhatsApp e preço) — decidir até semana 5.
2. **Gateway de cobrança:** Asaas vs Stripe (recomendação: Asaas, por Pix/boleto recorrente) — decidir até semana 7.
3. **Número WhatsApp dedicado** para a Cloud API (o atual `wa.me` pessoal não pode ser o mesmo) — decidir semana 1.
4. **Meta operacional EUDR** (nº de produtores georreferenciados até dez/2026) — combinar com as fundadoras até semana 6.
