# Automações & Agentes do Milsaca

> Documento de referência das automações de backend (jobs `pg_cron` + edge
> functions) que rodam sozinhas. Atualizado em 2026-06-14.

## Como funciona (visão geral)

As automações **enfileiram** mensagens na tabela `message_dispatches` (status
`pending`). Um job de cron (`process_pending_dispatches`, a cada 15 min) chama
a edge function **`send-dispatch`**, que renderiza o `notification_templates`
e entrega por **WhatsApp Cloud API** ou **Resend (e-mail)**.

> ⚠️ **Modo stub:** sem os secrets de provider configurados, `send-dispatch`
> NÃO envia nada externo — as mensagens são geradas/enfileiradas e descartadas
> como `failed/no_provider_configured`. Para ligar o envio real, ver
> [Como ativar](#como-ativar).

Cada automação segue o mesmo padrão: função `SECURITY DEFINER` +
`set search_path = public`, **dedup** via `NOT EXISTS` em `message_dispatches`,
log em `system_events` via `fn_log_system_event`, agendada por `cron.schedule`,
e executável só pelo cron (`revoke ... from authenticated/public` + grant
`service_role`).

## Pipeline de entrega

| Componente | Papel |
| --- | --- |
| `message_dispatches` | fila de mensagens (estados: `pending → sending → sent`/`failed`/`retried`) |
| `process_pending_dispatches()` (cron `*/15`) | trava com `for update skip locked`, marca `sending` + `attempts++` antes de chamar o worker (anti-duplicação), reaper de `sending` preso >10min |
| `send-dispatch` (edge) | renderiza template e envia (WhatsApp Cloud / Resend); falha temporária → volta a `pending` (retry), permanente → `failed`; variável de template faltando = falha permanente (não manda `{{x}}` cru) |
| `check_queue_failures()` (cron `*/15`) | conta falhas; alerta no painel + **notificação in-app pros admins** |

## Automações (cron jobs)

### Notificam a CORRETORA
| Função | O que faz | Cron (UTC) | Template |
| --- | --- | --- | --- |
| `nudge_payment_pending` | resumo de pagamentos pendentes vencidos (1 msg/corretora) | `0 14 * * *` | `pagamento_pendente` |
| `nudge_stale_leads` | resumo de leads parados >3d (última interação real: lead_events+propostas) | `0 12 * * *` | `lead_parado_3d` ⚠️ |
| `nudge_delivery_late` | resumo de entregas atrasadas | `0 10 * * *` | `entrega_atrasada` ⚠️ |
| `send_corretora_digest` | digest matinal (leads novos, propostas vencendo, entregas, pagamentos) | `0 11 * * 1-5` | `digest_corretora` |

### Notificam o PRODUTOR
| Função | O que faz | Cron (UTC) | Template |
| --- | --- | --- | --- |
| `nudge_proposta_expiring` | proposta vence em ≤48h | `0 11 * * *` | `proposta_vencendo` |
| `nudge_proposta_recebida` | lembra 24h após receber proposta | `0 13 * * *` | `proposta_recebida` |
| `notify_pagamento_confirmado` | avisa quando pagamento vira `pago` | `0 12 * * *` | `pagamento_confirmado` |
| `nudge_pos_entrega_avaliacao` | pede avaliação 2–9d após entrega concluída | `0 16 * * 1-5` | `pos_entrega_avaliacao` |
| `check_price_targets` | preço-alvo do produtor atingido (edge-triggered) | `30 12,21 * * 1-5` | `alvo_*` ⚠️ |
| `send_quote_digest` | resumo diário de cotações (**opt-in**: `produtores.quote_digest_optin`) | `0 11 * * 1-5` | `resumo_cotacoes` |
| `nudge_price_swing` | movimento brusco de preço ≥ `price_swing_pct` (**opt-in**) | `30 21 * * 1-5` | `cotacao_movimento` |
| `reengajar_produtor_inativo` | win-back de produtor sem login há `inactive_producer_days` (1x/sem, teto 200) | `0 14 * * 2` | `reengajamento_produtor` |
| `nudge_onboarding_incompleto` | produtor 3–14d sem lote e sem lead | `0 17 * * 1-5` | `onboarding_incompleto` |

### Billing / plataforma
| Função | O que faz | Cron (UTC) |
| --- | --- | --- |
| `expire_trials` | trial vencido → `expired` | `0 9 * * *` |
| `expire_subscriptions` | assinatura vencida >1d (grace) → `past_due` | `15 9 * * *` |
| `nudge_trial_ending` | trial acaba em 2–4d (e-mail) | `0 13 * * *` |
| `cleanup_old_notifications` | apaga notificações **lidas** >90d (preserva não-lidas) | `0 4 * * *` |

### Cotações
| Função | O que faz | Cron (UTC) |
| --- | --- | --- |
| `sync-cotacoes` (edge) | puxa CEPEA (arábica/conilon), ICE NY, PTAX | `0 12,21 * * 1-5` |
| `mark_stale_cotacoes` | marca cotação manual velha como `stale` | `0 2 * * *` |
| `check_market_quotes_stale` | detecta fonte automática sem dado fresco >30h + alerta admin | `0 14,23 * * 1-5` |
| `record_quote_source_error(slug,msg)` | RPC pra edge persistir falha de fonte | (chamada) |

## Configurações (`platform_settings`)

| Chave | Default | Usada por |
| --- | --- | --- |
| `price_swing_pct` | 5 | `nudge_price_swing` |
| `inactive_producer_days` | 30 | `reengajar_produtor_inativo` |
| `market_quotes_stale_hours` | 30 | `check_market_quotes_stale` |
| `queue_failure_alert_threshold` | 3 | `check_queue_failures` |
| `dispatch_worker_url` / `dispatch_worker_secret` | — | liga o envio real (sai do stub) |

## Como ativar (quando for lançar)

1. **Secrets da edge `send-dispatch`:** `WHATSAPP_PROVIDER_TOKEN` + `WHATSAPP_PHONE_ID` (e/ou `RESEND_API_KEY` + `RESEND_FROM`) + `SEND_DISPATCH_SECRET`.
2. `supabase functions deploy send-dispatch sync-cotacoes` (deploy das edge functions — há edições pendentes não deployadas).
3. Em `/admin/configurações`: setar `dispatch_worker_url` + `dispatch_worker_secret` (tira o `process_pending_dispatches` do modo stub).
4. **Opt-in:** botão no app pro produtor ativar `produtores.quote_digest_optin` (cotações/movimento brusco).

## ⚠️ Templates dormentes (seed incompleto no banco)

Estes templates são referenciados por funções mas **não existem** no banco (a
função pula com `template_not_found`): `trial_expira_3d`, `alvo_preco_atingido_whatsapp`,
`alvo_preco_atingido_email`. Criar via migration pra ativar os respectivos nudges.
(`lead_parado_3d` e `entrega_atrasada` passaram a ser criados nas migrations de
agregação/abaixo.)

## Convenção operacional

As migrations são aplicadas no banco **via MCP `apply_migration`** (re-carimba o
timestamp no apply) — por isso as versões no `schema_migrations` do banco
divergem dos prefixos dos arquivos. **Não rodar `supabase db push`** das que já
foram aplicadas por MCP. Sempre fazer pré-voo (checar colunas/constraints) antes
de aplicar em produção.

Migrations relevantes: `20261240..20261390` (correções de pipeline/preço/timezone/
billing/stale-leads/cotação + #d alerta in-app + #e agregação + automações novas).
