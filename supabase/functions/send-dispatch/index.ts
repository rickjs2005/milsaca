// =================================================================
// send-dispatch — worker que processa message_dispatches pendentes
// =================================================================
// Recebe POST { dispatch_id } chamado por `process_pending_dispatches`
// no banco (via net.http_post). Lê o despacho, renderiza o template,
// envia via provider (WhatsApp Cloud / Resend) e UPDATEa o status.
//
// O cron marca o despacho como 'sending' (e attempts++) ANTES de chamar
// este worker (anti-duplicação). Este worker aceita 'pending' OU 'sending'
// e finaliza:
//   - Sucesso              → status='sent', sent_at=now()
//   - Falha PERMANENTE     → status='failed', error=<motivo curto, sem PII>
//   - Falha TEMPORÁRIA     → status='pending' (volta pra fila; o cron/reaper
//                            tenta de novo na próxima rodada, até attempts=5)
//
// Classificação de falha:
//   TEMPORÁRIA (retry): timeout/AbortError, HTTP 429, HTTP 5xx, e os erros
//     esperados `*_not_implemented` (sem provider contratado → modo stub).
//   PERMANENTE (failed): HTTP 4xx (exceto 429) e variável de template
//     faltando (missing_template_var:<chave>).
//
// PII: NUNCA gravamos o corpo da resposta do provider na coluna `error`
// (pode conter telefone/e-mail). Só status HTTP + motivo curto.
//
// Os providers JÁ ESTÃO IMPLEMENTADOS (WhatsApp Cloud API + Resend). Sem os
// secrets de provider, sendWhatsApp/sendEmail lançam `*_not_implemented`
// (erro ESPERADO — mantém o modo stub do banco). Pra ligar:
//   1. SEND_DISPATCH_SECRET (deve casar com platform_settings.dispatch_worker_secret).
//   2. WhatsApp: WHATSAPP_PROVIDER_TOKEN + WHATSAPP_PHONE_ID (opcional WHATSAPP_API_VERSION).
//   3. Email: RESEND_API_KEY + RESEND_FROM (remetente de domínio verificado).
//   4. Deploy: `supabase functions deploy send-dispatch --no-verify-jwt`
//      (não verify_jwt porque o caller é o próprio banco, não usuário).
//   5. Em /admin/configuracoes: dispatch_worker_url + dispatch_worker_secret
//      (sai do modo stub no cron process_pending_dispatches).
//
// WhatsApp — TEMPLATE vs TEXT:
//   A Cloud API só aceita type:"text" dentro da janela de 24h aberta pelo
//   USUÁRIO. Notificação iniciada pela plataforma (nosso caso) fora da
//   janela exige TEMPLATE aprovado pela Meta (HSM) — texto livre leva 131047.
//   Regra deste worker:
//     - notification_templates.meta_template_name preenchido → type:"template",
//       parâmetros POSICIONAIS na ordem do array `variables` ({{1}} =
//       variables[0], ...). A ordem de `variables` é CONTRATO com o template
//       registrado na Meta — não reordenar sem re-registrar lá.
//     - meta_template_name NULL → type:"text" (fallback; só janela 24h).
//   Idioma do template: WHATSAPP_TEMPLATE_LANG (default pt_BR).
//   Registro/aprovação dos templates: docs/milsaca/meta-templates-whatsapp.md.
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
const WHATSAPP_TEMPLATE_LANG =
  Deno.env.get("WHATSAPP_TEMPLATE_LANG") ?? "pt_BR";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM =
  Deno.env.get("RESEND_FROM") ?? "Milsaca <nao-responda@milsaca.app>";

// -----------------------------------------------------------------
// Tipos de erro classificáveis (sem PII no que chega na coluna `error`)
// -----------------------------------------------------------------

// Erro HTTP de provider — carrega só o status; NÃO carrega o body (pode
// ter telefone/e-mail). O reason é curto e sem PII.
class ProviderHttpError extends Error {
  status: number;
  constructor(reason: string, status: number) {
    super(reason);
    this.name = "ProviderHttpError";
    this.status = status;
  }
}

// Variável de template faltando → falha PERMANENTE (não entrega {{x}} cru).
class MissingTemplateVarError extends Error {
  key: string;
  constructor(key: string) {
    super(`missing_template_var:${key}`);
    this.name = "MissingTemplateVarError";
    this.key = key;
  }
}

// Erros ESPERADOS enquanto não há provider contratado. Allowlist explícita
// (não `endsWith("_not_implemented")`) pra NÃO engolir erros reais futuros.
const EXPECTED_ERRORS = new Set([
  "whatsapp_provider_not_implemented",
  "email_provider_not_implemented",
]);

// Decide se uma falha é TEMPORÁRIA (retry → volta pra 'pending') ou
// PERMANENTE (→ 'failed').
function isTemporary(e: unknown): boolean {
  // Timeout / abort do fetch.
  if (e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError")) {
    return true;
  }
  // Erros esperados de provider não contratado (modo stub).
  if (e instanceof Error && EXPECTED_ERRORS.has(e.message)) {
    return true;
  }
  // HTTP do provider: 429 e 5xx são transitórios; 4xx (exceto 429) é permanente.
  if (e instanceof ProviderHttpError) {
    if (e.status === 429) return true;
    if (e.status >= 500 && e.status <= 599) return true;
    return false;
  }
  // Variável de template faltando é permanente.
  if (e instanceof MissingTemplateVarError) return false;
  // Desconhecido (ex.: falha de rede sem status): trata como temporário —
  // melhor reenviar do que matar uma mensagem por um soluço transitório.
  return true;
}

// POST JSON com timeout. Em erro HTTP lança ProviderHttpError (só status,
// sem body — PII). Em timeout o AbortController dispara AbortError.
async function postJson(
  reasonPrefix: string,
  url: string,
  headers: Record<string, string>,
  payload: unknown,
  timeoutMs = 10_000,
): Promise<void> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      // Drena o body pra não vazar o socket, mas NÃO o usamos no error (PII).
      await res.text().catch(() => "");
      throw new ProviderHttpError(`${reasonPrefix}_${res.status}`, res.status);
    }
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
  variables: unknown;
  meta_template_name: string | null;
};

// Comparação de string em tempo constante (não vaza tamanho/posição da
// diferença via timing). Substitui o `!==` no check do secret.
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  // XOR do tamanho garante que length-mismatch também consuma o loop todo.
  let diff = ab.length ^ bb.length;
  const n = Math.max(ab.length, bb.length);
  for (let i = 0; i < n; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

// Renderiza o template. Se QUALQUER {{var}} requerida não tiver valor no
// payload, NÃO entrega texto cru — lança MissingTemplateVarError (permanente).
function renderTemplate(body: string, vars: Record<string, unknown>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = vars[k];
    if (v === undefined || v === null || v === "") {
      throw new MissingTemplateVarError(k);
    }
    return String(v);
  });
}

// Monta os parâmetros POSICIONAIS do template Meta na ordem do array
// `variables` do notification_template ({{1}} = variables[0], ...).
// Mesma regra do renderTemplate: variável ausente/vazia → erro PERMANENTE
// (a Meta também rejeita parâmetro vazio). A Meta rejeita quebra de linha,
// tab e 4+ espaços consecutivos DENTRO de parâmetro — sanitizamos aqui
// (payloads como {{resumo}} dos digests vêm com \n).
function buildTemplateParams(
  variables: unknown,
  vars: Record<string, unknown>,
): string[] {
  const names = Array.isArray(variables) ? variables.map(String) : [];
  return names.map((k) => {
    const v = vars[k];
    if (v === undefined || v === null || v === "") {
      throw new MissingTemplateVarError(k);
    }
    return String(v)
      .replace(/\s*[\n\r\t]+\s*/g, " | ")
      .replace(/ {4,}/g, "   ")
      .trim();
  });
}

// -----------------------------------------------------------------
// Providers
// -----------------------------------------------------------------

// Template aprovado pela Meta (HSM) — único jeito de iniciar conversa fora
// da janela de 24h. Template inexistente/não aprovado → 4xx do Graph →
// classificado como falha PERMANENTE (aparece em /admin/fila-eventos).
async function sendWhatsAppTemplate(
  recipient: string,
  templateName: string,
  params: string[],
): Promise<void> {
  // Sem provider configurado: erro ESPERADO (allowlist) — mantém o modo stub.
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    throw new Error("whatsapp_provider_not_implemented");
  }
  // Meta Cloud API aceita E.164 só com dígitos (DDI+DDD+número).
  const to = recipient.replace(/\D/g, "");
  if (!to) throw new Error("whatsapp_recipient_invalido");

  await postJson(
    "whatsapp_send_falhou",
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_ID}/messages`,
    { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
    {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: WHATSAPP_TEMPLATE_LANG },
        ...(params.length > 0
          ? {
              components: [
                {
                  type: "body",
                  parameters: params.map((text) => ({ type: "text", text })),
                },
              ],
            }
          : {}),
      },
    },
  );
}

async function sendWhatsApp(recipient: string, body: string): Promise<void> {
  // Sem provider configurado: erro ESPERADO (allowlist) — mantém o modo stub.
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    throw new Error("whatsapp_provider_not_implemented");
  }
  // Meta Cloud API aceita E.164 só com dígitos (DDI+DDD+número).
  const to = recipient.replace(/\D/g, "");
  if (!to) throw new Error("whatsapp_recipient_invalido");

  await postJson(
    "whatsapp_send_falhou",
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_ID}/messages`,
    { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { preview_url: false, body },
    },
  );
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
  await postJson(
    "email_send_falhou",
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
}

// -----------------------------------------------------------------
// Handler
// -----------------------------------------------------------------

// @ts-expect-error — Deno.serve global
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405 });
  }

  // Auth — só o banco/pg_cron deve chamar com o bearer secret.
  // Comparação timing-safe (constante) pra não vazar o secret via timing.
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${SEND_DISPATCH_SECRET}`;
  if (!SEND_DISPATCH_SECRET || !timingSafeEqual(auth, expected)) {
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
  // O cron marca 'sending' ANTES de chamar; aceitamos pending OU sending.
  // Qualquer outro status (sent/failed/retried) já foi processado.
  if (dispatch.status !== "pending" && dispatch.status !== "sending") {
    return new Response("already_processed", { status: 200 });
  }

  let template: Template | null = null;
  if (dispatch.template_id) {
    const { data: t } = await supabase
      .from("notification_templates")
      .select("channel, kind, body, subject, variables, meta_template_name")
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

  try {
    // Render/buildTemplateParams PODEM lançar MissingTemplateVarError
    // (permanente) — ficam DENTRO do try pra serem classificados e nunca
    // entregar {{x}} cru.
    if (dispatch.channel === "whatsapp") {
      if (template.meta_template_name) {
        // Template Meta (HSM): parâmetros posicionais na ordem de `variables`.
        const params = buildTemplateParams(
          template.variables,
          dispatch.payload,
        );
        await sendWhatsAppTemplate(
          dispatch.recipient,
          template.meta_template_name,
          params,
        );
      } else {
        // Sem mapeamento Meta: texto livre (só funciona em janela de 24h).
        const renderedBody = renderTemplate(template.body, dispatch.payload);
        await sendWhatsApp(dispatch.recipient, renderedBody);
      }
    } else if (dispatch.channel === "email") {
      const renderedBody = renderTemplate(template.body, dispatch.payload);
      const renderedSubject = template.subject
        ? renderTemplate(template.subject, dispatch.payload)
        : "Milsaca";
      await sendEmail(dispatch.recipient, renderedSubject, renderedBody);
    } else {
      // Canal desconhecido é permanente (nunca vai resolver sozinho).
      throw new ProviderHttpError("unknown_channel", 400);
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
    // Motivo CURTO e SEM PII pra coluna `error` (e.message dos nossos
    // erros nunca inclui body de provider — ver ProviderHttpError/postJson).
    const reason = e instanceof Error ? e.message : String(e);
    const expected = EXPECTED_ERRORS.has(reason);
    const temporary = isTemporary(e);

    if (expected) {
      // Placeholder esperado (sem provider contratado) → warn, não Sentry.
      log.warn("dispatch_provider_pendente", {
        dispatchId,
        channel: dispatch.channel,
        reason,
      });
    } else if (temporary) {
      // Falha transitória (timeout/429/5xx) → warn; será reenviada. Não é
      // erro "real" de aplicação, então não vai pro Sentry.
      log.warn("dispatch_falha_temporaria", {
        dispatchId,
        channel: dispatch.channel,
        reason,
      });
    } else {
      // Falha PERMANENTE de envio → error + Sentry.
      log.error("dispatch_send_falhou", {
        dispatchId,
        channel: dispatch.channel,
        err: safeError(e),
      });
      if (SENTRY_DSN) {
        Sentry.captureException(e, { tags: { dispatch_id: dispatchId } });
      }
    }

    if (temporary) {
      // Volta pra 'pending': o cron/reaper repega na próxima rodada (até
      // attempts=5). NÃO marca failed — falha temporária não mata a msg.
      // Grava o motivo curto pra diagnóstico (sem PII).
      await supabase
        .from("message_dispatches")
        .update({ status: "pending", error: reason })
        .eq("id", dispatchId);
      return new Response(
        JSON.stringify({ ok: false, retry: true, error: reason }),
        { status: 503, headers: { "content-type": "application/json" } },
      );
    }

    // Permanente → failed com motivo curto (sem PII).
    await supabase
      .from("message_dispatches")
      .update({ status: "failed", error: reason })
      .eq("id", dispatchId);
    return new Response(
      JSON.stringify({ ok: false, error: reason }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }
});
