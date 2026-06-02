// =================================================================
// send-dispatch — worker que processa message_dispatches pendentes
// =================================================================
// Recebe POST { dispatch_id } chamado por `process_pending_dispatches`
// no banco (via net.http_post). Lê o despacho, renderiza o template,
// envia via provider (WhatsApp Cloud / Resend) e UPDATEa o status.
//
// Os providers JÁ ESTÃO IMPLEMENTADOS (WhatsApp Cloud API + Resend). É
// plug-and-play: sem os secrets de provider, sendWhatsApp/sendEmail lançam
// `*_not_implemented` (erro ESPERADO — mantém o modo stub do banco). Com os
// secrets, enviam de verdade. Pra ligar:
//   1. SEND_DISPATCH_SECRET (deve casar com platform_settings.dispatch_worker_secret).
//   2. WhatsApp: WHATSAPP_PROVIDER_TOKEN + WHATSAPP_PHONE_ID (opcional WHATSAPP_API_VERSION).
//   3. Email: RESEND_API_KEY + RESEND_FROM (remetente de domínio verificado).
//   4. Deploy: `supabase functions deploy send-dispatch --no-verify-jwt`
//      (não verify_jwt porque o caller é o próprio banco, não usuário).
//   5. Em /admin/configuracoes: dispatch_worker_url + dispatch_worker_secret
//      (sai do modo stub no cron process_pending_dispatches).
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
import { log, safeError } from "../_shared/log.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SEND_DISPATCH_SECRET = Deno.env.get("SEND_DISPATCH_SECRET") ?? "";

// Providers — preenchidos via secrets quando contratar. Vazio = modo stub.
const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_PROVIDER_TOKEN") ?? "";
const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID") ?? "";
const WHATSAPP_API_VERSION = Deno.env.get("WHATSAPP_API_VERSION") ?? "v21.0";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM =
  Deno.env.get("RESEND_FROM") ?? "Milsaca <nao-responda@milsaca.app>";

// POST JSON com timeout (evita worker pendurado num provider lento).
async function postJson(
  url: string,
  headers: Record<string, string>,
  payload: unknown,
  timeoutMs = 10_000,
): Promise<{ ok: boolean; status: number; text: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

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

// Erros ESPERADOS enquanto não há provider contratado. Allowlist explícita
// (não `endsWith("_not_implemented")`) pra NÃO engolir erros reais futuros —
// quando os providers forem implementados, qualquer erro novo vai pro Sentry.
const EXPECTED_ERRORS = new Set([
  "whatsapp_provider_not_implemented",
  "email_provider_not_implemented",
]);

// -----------------------------------------------------------------
// Providers — placeholders. Substituir por implementação real.
// -----------------------------------------------------------------

async function sendWhatsApp(recipient: string, body: string): Promise<void> {
  // Sem provider configurado: erro ESPERADO (allowlist) — mantém o modo stub.
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    throw new Error("whatsapp_provider_not_implemented");
  }
  // Meta Cloud API aceita E.164 só com dígitos (DDI+DDD+número).
  const to = recipient.replace(/\D/g, "");
  if (!to) throw new Error("whatsapp_recipient_invalido");

  const { ok, status, text } = await postJson(
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_ID}/messages`,
    { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { preview_url: false, body },
    },
  );
  if (!ok) {
    throw new Error(`whatsapp_send_falhou_${status}: ${text.slice(0, 300)}`);
  }
}

async function sendEmail(
  recipient: string,
  subject: string,
  body: string,
): Promise<void> {
  // Sem provider configurado: erro ESPERADO (allowlist) — mantém o modo stub.
  if (!RESEND_API_KEY) {
    throw new Error("email_provider_not_implemented");
  }
  const { ok, status, text } = await postJson(
    "https://api.resend.com/emails",
    { Authorization: `Bearer ${RESEND_API_KEY}` },
    {
      from: RESEND_FROM,
      to: recipient,
      subject,
      // Templates são texto; preserva quebras de linha no HTML.
      html: body.replace(/\n/g, "<br>"),
      text: body,
    },
  );
  if (!ok) {
    throw new Error(`email_send_falhou_${status}: ${text.slice(0, 300)}`);
  }
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
    log.warn("dispatch_not_found", {
      dispatchId,
      ...(dErr ? { err: safeError(dErr) } : {}),
    });
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
    log.warn("template_not_found", {
      dispatchId,
      templateId: dispatch.template_id,
    });
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
    const expected = EXPECTED_ERRORS.has(msg);
    // Placeholders esperados (sem provider contratado) viram warn; qualquer
    // erro fora da allowlist é falha real de envio → error + Sentry.
    if (expected) {
      log.warn("dispatch_provider_pendente", {
        dispatchId,
        channel: dispatch.channel,
        reason: msg,
      });
    } else {
      log.error("dispatch_send_falhou", {
        dispatchId,
        channel: dispatch.channel,
        err: safeError(e),
      });
      if (SENTRY_DSN) {
        Sentry.captureException(e, { tags: { dispatch_id: dispatchId } });
      }
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
