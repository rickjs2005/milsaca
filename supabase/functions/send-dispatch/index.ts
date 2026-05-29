// =================================================================
// send-dispatch — worker que processa message_dispatches pendentes
// =================================================================
// Recebe POST { dispatch_id } chamado por `process_pending_dispatches`
// no banco (via net.http_post). Lê o despacho, renderiza o template,
// envia via provider (WhatsApp Cloud / Resend) e UPDATEa o status.
//
// Sem providers ainda — retorna 501 not_implemented. Quando contratar:
//   1. Setar SEND_DISPATCH_SECRET (deve casar com dispatch_worker_secret
//      em platform_settings).
//   2. Setar WHATSAPP_PROVIDER_TOKEN / RESEND_API_KEY.
//   3. Implementar `sendWhatsApp` e `sendEmail` abaixo.
//   4. Deploy: `supabase functions deploy send-dispatch --no-verify-jwt`.
//      (não verify_jwt porque o caller é o próprio banco, não usuário)
//
// Convenção da função:
//   - Sucesso → UPDATE status='sent', sent_at=now()
//   - Falha permanente → UPDATE status='failed', error=<motivo>
//   - Falha temporária (timeout) → não atualiza, deixa worker retry
// =================================================================

// @ts-expect-error — Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-expect-error — Deno runtime
import * as Sentry from "https://esm.sh/@sentry/deno@8.45.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SEND_DISPATCH_SECRET = Deno.env.get("SEND_DISPATCH_SECRET") ?? "";

// Observabilidade: só inicializa se o secret SENTRY_DSN existir. No-op sem DSN.
const SENTRY_DSN = Deno.env.get("SENTRY_DSN");
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Dispatch = {
  id: string;
  template_id: string | null;
  channel: "whatsapp" | "email";
  recipient: string;
  payload: Record<string, unknown>;
  status: string;
};

type Template = {
  channel: string;
  kind: string;
  body: string;
  subject: string | null;
};

function renderTemplate(body: string, vars: Record<string, unknown>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`));
}

// -----------------------------------------------------------------
// Providers — placeholders. Substituir por implementação real.
// -----------------------------------------------------------------

async function sendWhatsApp(recipient: string, body: string): Promise<void> {
  // TODO: implementar com Meta Cloud API.
  // POST https://graph.facebook.com/v18.0/{PHONE_ID}/messages
  // headers: Authorization Bearer WHATSAPP_PROVIDER_TOKEN
  // body: { messaging_product: "whatsapp", to: recipient, type: "text", text: { body } }
  void recipient;
  void body;
  throw new Error("whatsapp_provider_not_implemented");
}

async function sendEmail(
  recipient: string,
  subject: string,
  body: string,
): Promise<void> {
  // TODO: implementar com Resend.
  // POST https://api.resend.com/emails
  // headers: Authorization Bearer RESEND_API_KEY
  // body: { from, to: recipient, subject, html: body }
  void recipient;
  void subject;
  void body;
  throw new Error("email_provider_not_implemented");
}

// -----------------------------------------------------------------
// Handler
// -----------------------------------------------------------------

// @ts-expect-error — Deno.serve global
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405 });
  }

  // Auth — só o banco/pg_cron deve chamar com o bearer secret
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${SEND_DISPATCH_SECRET}`;
  if (!SEND_DISPATCH_SECRET || auth !== expected) {
    return new Response("unauthorized", { status: 401 });
  }

  let body: { dispatch_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("invalid_json", { status: 400 });
  }
  const dispatchId = body.dispatch_id;
  if (!dispatchId) {
    return new Response("missing_dispatch_id", { status: 400 });
  }

  // Lê dispatch + template
  const { data: dispatch, error: dErr } = await supabase
    .from("message_dispatches")
    .select("id, template_id, channel, recipient, payload, status")
    .eq("id", dispatchId)
    .maybeSingle<Dispatch>();

  if (dErr || !dispatch) {
    return new Response("dispatch_not_found", { status: 404 });
  }
  if (dispatch.status !== "pending") {
    return new Response("already_processed", { status: 200 });
  }

  let template: Template | null = null;
  if (dispatch.template_id) {
    const { data: t } = await supabase
      .from("notification_templates")
      .select("channel, kind, body, subject")
      .eq("id", dispatch.template_id)
      .maybeSingle<Template>();
    template = t;
  }

  if (!template) {
    await supabase
      .from("message_dispatches")
      .update({ status: "failed", error: "template_not_found" })
      .eq("id", dispatchId);
    return new Response("template_not_found", { status: 404 });
  }

  const renderedBody = renderTemplate(template.body, dispatch.payload);

  try {
    if (dispatch.channel === "whatsapp") {
      await sendWhatsApp(dispatch.recipient, renderedBody);
    } else if (dispatch.channel === "email") {
      const renderedSubject = template.subject
        ? renderTemplate(template.subject, dispatch.payload)
        : "Milsaca";
      await sendEmail(dispatch.recipient, renderedSubject, renderedBody);
    } else {
      throw new Error("unknown_channel");
    }

    await supabase
      .from("message_dispatches")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", dispatchId);

    return new Response(
      JSON.stringify({ ok: true, dispatch_id: dispatchId }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Não polui o Sentry com os placeholders "_not_implemented" esperados
    // enquanto não há provider contratado; só erros reais de envio.
    if (SENTRY_DSN && !msg.endsWith("_not_implemented")) {
      Sentry.captureException(e, { tags: { dispatch_id: dispatchId } });
    }
    await supabase
      .from("message_dispatches")
      .update({ status: "failed", error: msg })
      .eq("id", dispatchId);
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }
});
