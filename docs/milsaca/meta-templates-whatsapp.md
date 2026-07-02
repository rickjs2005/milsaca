# WhatsApp Cloud API — Registro de templates na Meta e ativação da mensageria (F0)

**Data:** 2026-07-02 · **Par de código:** migrations `20261470` (meta_template_name) e `20261480` (contrato_sufixo), worker `supabase/functions/send-dispatch/index.ts`

## Por que templates (HSM)

A Cloud API só aceita mensagem de texto livre (`type:"text"`) dentro da **janela de 24h** aberta por mensagem do usuário. Toda notificação iniciada pela plataforma (nudges, alertas, digests — o nosso caso) **exige template pré-aprovado pela Meta**; texto livre fora da janela retorna erro `131047` e o dispatch morre.

## Como o worker decide (contrato técnico)

- `notification_templates.meta_template_name` **preenchido** → envia `type:"template"` com parâmetros **posicionais na ordem do array `variables`** (`{{1}}` = `variables[0]`, `{{2}}` = `variables[1]`…).
- `meta_template_name` **NULL** → fallback `type:"text"` (só janela 24h).
- **A ordem de `variables` é contrato com o template registrado na Meta.** Não reordenar sem re-registrar o template lá.
- O **corpo no banco NÃO é enviado** no modo template — ele fica como documentação/fallback. O corpo que vale é o registrado na Meta. Eles podem divergir de propósito (ver ajustes abaixo).
- Sanitização de parâmetros (a Meta rejeita): quebras de linha/tabs viram `" | "`, 4+ espaços viram 3, e o valor é `trim()`ado. Parâmetro **vazio → falha permanente** (mesma regra do render de texto).
- Idioma: `WHATSAPP_TEMPLATE_LANG` (default `pt_BR`).

## ⚠️ Fonte da verdade antes de registrar

Os corpos abaixo vêm das migrations, mas 3 kinds têm **duas versões de seed** no repositório (`20260609/20260612/20260615` vs `20261400_seed_templates_dormentes`, este com `on conflict do nothing`). Antes de registrar na Meta, exporte o que está **de fato** no banco:

```sql
select kind, name, body, variables, meta_template_name
  from notification_templates
 where channel = 'whatsapp'
 order by kind;
```

Kinds a conferir: `lead_parado_3d`, `entrega_atrasada`, `alvo_preco_atingido_whatsapp`. Se o corpo/`variables` do banco divergir da tabela abaixo, ajuste o template Meta para casar com o **banco** (a ordem de `variables` do banco é o que o worker envia).

## Os 18 templates

Convenção de nome: `milsaca_<kind>` (a migration `20261470` já seeda essa coluna). Categoria: a Meta pode reclassificar na revisão — aceite a reclassificação, não tente burlar.

| # | Nome Meta | Categoria | Parâmetros (ordem = `variables`) |
|---|---|---|---|
| 1 | `milsaca_lead_novo` | UTILITY | corretora_nome, produtor_nome, cidade, uf, sacas |
| 2 | `milsaca_lead_parado_3d` ⚠️ | UTILITY | corretora_nome, produtor_nome |
| 3 | `milsaca_entrega_atrasada` ⚠️ | UTILITY | corretora_nome, sequencia, contrato_code, produtor_nome, data_prevista |
| 4 | `milsaca_alvo_preco_atingido_whatsapp` ⚠️ | UTILITY | nome, produto, condicao, alvo, preco_atual, praca, corretora |
| 5 | `milsaca_alvo_dinamico_whatsapp` | UTILITY | nome, detalhe, produto, praca, corretora |
| 6 | `milsaca_repasse_criado` | UTILITY | produtor, valor, contrato, corretora |
| 7 | `milsaca_repasse_pago` | UTILITY | produtor, valor, contrato, corretora |
| 8 | `milsaca_notificacao` | UTILITY | mensagem |
| 9 | `milsaca_proposta_vencendo` | UTILITY | produtor_nome, corretora_nome, preco_saca, validade |
| 10 | `milsaca_pagamento_pendente` | UTILITY | corretora_nome, valor_liquido, produtor_nome, contrato_sufixo, data_prevista |
| 11 | `milsaca_resumo_cotacoes` | MARKETING* | nome, resumo |
| 12 | `milsaca_cotacao_movimento` | MARKETING* | nome, detalhe |
| 13 | `milsaca_proposta_recebida` | UTILITY | produtor_nome, corretora_nome, preco_saca |
| 14 | `milsaca_pagamento_confirmado` | UTILITY | produtor_nome, valor_liquido, contrato_sufixo |
| 15 | `milsaca_pos_entrega_avaliacao` | UTILITY/MKT* | produtor_nome, corretora_nome |
| 16 | `milsaca_digest_corretora` | MARKETING* | corretora_nome, resumo |
| 17 | `milsaca_reengajamento_produtor` | MARKETING | nome |
| 18 | `milsaca_onboarding_incompleto` | UTILITY/MKT* | nome |

\* Provável reclassificação pela Meta. Templates MARKETING custam mais por conversa e exigem opt-in — confirmar que esses nudges respeitam a preferência do usuário antes do go-live.

### Corpos para registrar (numerados)

Regras da Meta respeitadas aqui: corpo não pode ser só variável; **duas variáveis não podem ficar adjacentes** (`{{3}}{{4}}`); parâmetro não pode ter quebra de linha (o corpo pode). Onde o corpo do banco violaria isso, o corpo Meta abaixo foi **ajustado de propósito** (o worker trima os parâmetros, então `" (contrato X)"` vira `"(contrato X)"` e encaixa após espaço).

1. **milsaca_lead_novo**
   `Olá {{1}}, há um novo produtor interessado: {{2}} de {{3}}/{{4}}. Sacas: {{5}}. Responda dentro de 2h pra aumentar chance de fechamento.`
2. **milsaca_lead_parado_3d** ⚠️ conferir banco
   `Oi {{1}}, o lead com {{2}} está sem mensagem há 3 dias. Vale dar um toque ou marcar como perdido.`
3. **milsaca_entrega_atrasada** ⚠️ conferir banco
   `Oi {{1}}, a entrega #{{2}} do contrato {{3}} ({{4}}) era pra {{5}} mas ainda não foi confirmada. Vale conferir status.`
4. **milsaca_alvo_preco_atingido_whatsapp** ⚠️ conferir banco
   `Oi {{1}}, sua cotação alvo de {{2}} {{3}} R$ {{4}}/saca foi atingida agora. Preço atual: R$ {{5}}. Praça: {{6}}. Corretora: {{7}}.`
5. **milsaca_alvo_dinamico_whatsapp**
   `Oi {{1}}, {{2}} — {{3}} em {{4}}. Corretora: {{5}}. Veja no Milsaca.`
6. **milsaca_repasse_criado** *(ordem dos params ≠ ordem na frase; conferir com a coluna `variables`: produtor, valor, contrato, corretora)*
   `Olá {{1}}! 🌱☕` ⏎⏎ `A {{4}} registrou um repasse de R$ {{2}} a receber (contrato {{3}}). Você acompanha o status no app da Milsaca.` ⏎⏎ `Qualquer dúvida, é só chamar aqui.`
7. **milsaca_repasse_pago**
   `Olá {{1}}! 🌱☕` ⏎⏎ `Seu repasse de R$ {{2}} (contrato {{3}}) foi confirmado pela {{4}}.` ⏎⏎ `Qualquer dúvida, é só chamar aqui. — Milsaca`
8. **milsaca_notificacao** *(ajustado: corpo do banco é só a variável, a Meta rejeita)*
   `Milsaca: {{1}}` ⏎⏎ `Acompanhe os detalhes no app.`
9. **milsaca_proposta_vencendo**
   `Oi {{1}}, a {{2}} te ofereceu R$ {{3}}/saca e a proposta vence em {{4}}. Abra o app do Milsaca e responda antes de vencer.`
10. **milsaca_pagamento_pendente** *(ajustado: `{{3}}{{4}}` adjacentes viram `{{3}} {{4}}`; o trim do worker fecha o espaçamento)*
    `Oi {{1}}, o pagamento de R$ {{2}} pro produtor {{3}} {{4}} estava previsto pra {{5}} e segue pendente. Vale acertar/registrar.`
11. **milsaca_resumo_cotacoes** *(o `resumo` chega multilinha e o worker converte pra `" | "`)*
    `Bom dia, {{1}}! Café hoje: {{2}}` ⏎⏎ `Acompanhe tudo no Milsaca.`
12. **milsaca_cotacao_movimento**
    `Atenção, {{1}}! Movimento forte no café: {{2}}. Veja no Milsaca.`
13. **milsaca_proposta_recebida**
    `Oi {{1}}, a {{2}} te enviou uma proposta de R$ {{3}}/saca. Abra o Milsaca pra responder.`
14. **milsaca_pagamento_confirmado** *(ajustado: espaço antes de `{{3}}`; migration `20261480` garante que o sufixo nunca é vazio)*
    `Oi {{1}}, seu pagamento de R$ {{2}} {{3}} foi confirmado pela corretora. ✅`
15. **milsaca_pos_entrega_avaliacao**
    `Oi {{1}}, sua entrega com a {{2}} foi concluída! Que tal avaliar a corretora no Milsaca? Leva 1 minuto. ⭐`
16. **milsaca_digest_corretora** *(ajustado: corpo do banco termina na variável; fechamos a frase)*
    `Bom dia, {{1}}! Seu dia no Milsaca: {{2}}. Bom trabalho! ☕`
17. **milsaca_reengajamento_produtor**
    `Oi {{1}}, faz um tempo que você não dá uma olhada no Milsaca. As cotações do café mudaram — vale conferir os preços e suas negociações. ☕`
18. **milsaca_onboarding_incompleto**
    `Oi {{1}}, vi que você começou seu cadastro no Milsaca mas ainda falta um passo pra começar a vender seu café. Leva 2 minutos — qualquer dúvida, é só chamar!`

Amostras de exemplo (a Meta pede na submissão): use dados fictícios plausíveis — "João da Silva", "Manhuaçu", "MG", "R$ 2.350,00", "C-2026-014".

## Runbook de ativação (ordem exata)

### 1. Provisionamento externo (dias, começar já)
1. **Meta Business Manager:** verificar o negócio (CNPJ + documentos).
2. Criar app no Meta for Developers → produto *WhatsApp Business Platform*.
3. **Número dedicado** para a Cloud API (o número usado hoje nos links `wa.me` NÃO pode ser reaproveitado sem migrá-lo — decisão da semana 1 do plano F0).
4. Registrar os 18 templates acima (idioma **pt_BR**) e aguardar aprovação. Anotar rejeições e ajustar.
5. **Resend:** verificar domínio (SPF + DKIM + DMARC), criar API key.
6. **SMTP de auth (gap I1):** no dashboard Supabase → Auth → SMTP, apontar para o SMTP do Resend (resolve OTP/confirmação em produção).

### 2. Aplicar migrations
```bash
# revisar antes; NÃO rodar db:push remoto sem credenciais confirmadas (CLAUDE.md)
supabase db push
```
Migrations novas: `20261470000000_meta_template_names.sql`, `20261480000000_contrato_sufixo_nao_vazio.sql`.
Depois, regenerar tipos se houver divergência (`packages/types/src/database.ts` já foi atualizado à mão para `meta_template_name`).

### 3. Secrets e deploy do worker
```bash
supabase secrets set SEND_DISPATCH_SECRET=<mesmo valor que irá em platform_settings>
supabase secrets set WHATSAPP_PROVIDER_TOKEN=<token permanente do system user>
supabase secrets set WHATSAPP_PHONE_ID=<phone number id>
supabase secrets set RESEND_API_KEY=<re_...>
supabase secrets set RESEND_FROM="Milsaca <nao-responda@milsaca.app>"
# opcionais: WHATSAPP_API_VERSION (default v21.0), WHATSAPP_TEMPLATE_LANG (default pt_BR)

supabase functions deploy send-dispatch --no-verify-jwt
```

### 4. Sair do modo stub (o "interruptor")
Em `/admin/configuracoes`: preencher `dispatch_worker_url` (URL da edge function) e `dispatch_worker_secret` (= `SEND_DISPATCH_SECRET`).
**Enquanto vazios, o cron descarta pendentes como `no_provider_configured` — não existe backlog para explodir no go-live.**

### 5. Teste controlado (antes de liberar geral)
```sql
-- dispatch de teste para o SEU número (E.164 com DDI, ex.: 5533988887777)
insert into message_dispatches (template_id, channel, recipient, payload)
select id, 'whatsapp', '55DDDNUMERO',
       '{"produtor_nome":"Teste","corretora_nome":"Corretora Teste","preco_saca":"2.350,00"}'::jsonb
  from notification_templates
 where channel='whatsapp' and kind='proposta_recebida';
-- aguardar a rodada do cron (*/15) ou: select process_pending_dispatches();
select status, error, attempts from message_dispatches order by created_at desc limit 5;
```
Repetir com um e-mail (`kind='corretora_aprovada'`). Sucesso = `status='sent'` e mensagem recebida.

### 6. Rollout
1. Semana 1: só e-mail + WhatsApp para as 5 corretoras fundadoras.
2. Validar em `/admin/fila-eventos`: sem acúmulo, sem `failed` inesperado.
3. Monitorar **quality rating** do número no WhatsApp Manager (bloqueios derrubam a qualidade e a Meta limita o envio). Se cair, revisar frequência dos nudges MARKETING.
4. Liberar geral.

### 7. Pós-go-live
- Conferir preferências/opt-out para os templates de MARKETING (LGPD + política Meta).
- Alarme: `system_events` já tem `check_queue_failures`; conferir que falhas de template (`whatsapp_send_falhou_4xx`) aparecem lá.
- Registrar custos: conversas *utility* ≈ US$ 0,008–0,04 no BR; MARKETING é mais caro.
