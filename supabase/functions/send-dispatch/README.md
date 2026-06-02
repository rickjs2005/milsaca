# send-dispatch

Worker que processa `message_dispatches` pendentes — chamado pelo banco (via `net.http_post` em `process_pending_dispatches`).

## Estado

**Providers JÁ implementados** (WhatsApp Cloud API + Resend). É plug-and-play:
enquanto os secrets de provider não existem, o worker lança `*_not_implemented`
(erro esperado) e o banco segue no modo stub. Setou os secrets → entrega de
verdade. **Não deployado ainda** (esperando contratação do provider).

Pra ligar (não precisa mexer no código):

1. Secrets no Supabase Functions:
   ```bash
   supabase secrets set SEND_DISPATCH_SECRET=<random-hex>
   # WhatsApp (Meta Cloud API):
   supabase secrets set WHATSAPP_PROVIDER_TOKEN=<meta-token>
   supabase secrets set WHATSAPP_PHONE_ID=<phone-number-id>
   # supabase secrets set WHATSAPP_API_VERSION=v21.0   # opcional (default v21.0)
   # Email (Resend):
   supabase secrets set RESEND_API_KEY=<resend-key>
   supabase secrets set RESEND_FROM="Milsaca <nao-responda@SEU-DOMINIO-VERIFICADO>"
   ```
   (Pode setar só WhatsApp OU só email — o canal sem secret continua caindo no
   erro esperado, sem ir pro Sentry.)
2. Deploy:
   ```bash
   supabase functions deploy send-dispatch --no-verify-jwt
   ```
3. Em `/admin/configuracoes` setar (sai do modo stub no cron):
   - `dispatch_worker_url` = `https://<ref>.supabase.co/functions/v1/send-dispatch`
   - `dispatch_worker_secret` = mesmo valor de `SEND_DISPATCH_SECRET`

A partir daí o cron `milsaca-process-dispatches` para de marcar dispatches como
`no_provider_configured` e começa a entregar de verdade.

## Secrets reconhecidos

| Secret | Obrigatório | Uso |
| --- | --- | --- |
| `SEND_DISPATCH_SECRET` | sim | bearer que o banco envia (casa com `dispatch_worker_secret`) |
| `WHATSAPP_PROVIDER_TOKEN` | p/ WhatsApp | token da Meta Cloud API |
| `WHATSAPP_PHONE_ID` | p/ WhatsApp | Phone Number ID da Meta |
| `WHATSAPP_API_VERSION` | não | default `v21.0` |
| `RESEND_API_KEY` | p/ email | chave da Resend |
| `RESEND_FROM` | p/ email | remetente de domínio verificado |
| `SENTRY_DSN` | não | erros reais de envio vão pro Sentry |

## Contrato HTTP

`POST /` com:

- `Authorization: Bearer <SEND_DISPATCH_SECRET>`
- `Content-Type: application/json`
- Body: `{ "dispatch_id": "<uuid>" }`

Resposta:
- `200` + `{ok:true}` → enviado, `message_dispatches.status='sent'`
- `502` + `{ok:false,error}` → falha permanente, status='failed'
- `401` → secret errado
- `404` → dispatch não encontrado

## Não fica em verify_jwt

A função é chamada pelo banco via service role, não por usuário autenticado. Use `--no-verify-jwt` no deploy + valide o `SEND_DISPATCH_SECRET` no handler (já feito).
