"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { checkRateLimit, identityKey } from "@/lib/rate-limit";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import { createHash } from "node:crypto";

/**
 * Dispara email com link de recuperação. O link vai pro callback
 * (/auth/callback?code=...&next=/redefinir-senha) que troca o code por
 * sessão temporária e redireciona pra tela que pede nova senha.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    redirect("/esqueci-senha?error=Email%20obrigat%C3%B3rio");
  }

  const h = await headers();

  // Mensagem genérica de sucesso — SEMPRE a mesma, independente de o email
  // existir, do envio ter ocorrido ou de termos abortado por rate-limit.
  // Preserva anti-enumeration: o atacante não distingue os ramos.
  const ok = `Se o email ${email} estiver cadastrado, vai chegar um link em alguns minutos.`;

  // Rate limit por email: 3 disparos/hora. Anti-spam de email — impede que
  // alguém entupa a caixa de uma vítima pedindo reset em loop. Em excesso,
  // NÃO envia e finge sucesso (mesma mensagem) pra não vazar nada.
  const rlEmail = await checkRateLimit(
    identityKey("reset-password", email),
    3,
    3600,
  );

  // Rate limit por IP: 10 disparos/hora. Espelha o padrão de hash do
  // /cadastrar (granularidade por origem, sem armazenar IP cru). Barra um
  // mesmo cliente varrendo vários emails de vítimas distintas.
  const xff = h.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0]?.trim() : h.get("x-real-ip");
  const salt = process.env.LEAD_IP_SALT ?? "milsaca-reset";
  const ipKey = createHash("sha256")
    .update(`${salt}|${ip ?? "no-ip"}`)
    .digest("hex")
    .slice(0, 16);
  const rlIp = await checkRateLimit(`reset-password:${ipKey}`, 10, 3600);

  // Estourou qualquer limite → finge sucesso sem disparar email.
  if (!rlEmail.allowed || !rlIp.allowed) {
    redirect(`/esqueci-senha?ok=${encodeURIComponent(ok)}`);
  }

  const supabase = await createClient();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (h.get("origin") ?? `https://${h.get("host") ?? "localhost:3000"}`);

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/redefinir-senha`,
  });

  // Não vaza se o email existe ou não — sempre redireciona pro mesmo
  // estado de sucesso. Reduz superfície de enumeration.
  if (error) {
    const log = await getReqLogger({ action: "requestPasswordReset" });
    log.warn("reset_senha_email_falhou", { err: safeError(error) });
  }

  redirect(`/esqueci-senha?ok=${encodeURIComponent(ok)}`);
}
