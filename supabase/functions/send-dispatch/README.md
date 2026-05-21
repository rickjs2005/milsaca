# send-dispatch

Worker que processa `message_dispatches` pendentes — chamado pelo banco (via `net.http_post` em `process_pending_dispatches`).

## Estado

**Não deployado.** Templates dos providers (WhatsApp Cloud / Resend) ainda não implementados. Quando contratar:

1. Implementar `sendWhatsApp` e `sendEmail` em `index.ts`
2. Setar secrets no Supabase Functions:
   ```bash
   supabase secrets set SEND_DISPATCH_SECRET=<random-hex>
   supabase secrets set WHATSAPP_PROVIDER_TOKEN=<meta-token>
   supabase secrets set RESEND_API_KEY=<resend-key>
   ```
3. Deploy:
   ```bash
   supabase functions deploy send-dispatch --no-verify-jwt
   ```
4. Em `/admin/configuracoes` setar:
   - `dispatch_worker_url` = `https://<ref>.supabase.co/functions/v1/send-dispatch`
   - `dispatch_worker_secret` = mesmo valor de `SEND_DISPATCH_SECRET`

A partir daí o cron `milsaca-process-dispatches` para de marcar dispatches como `no_provider_configured` e começa a entregar de verdade.

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
