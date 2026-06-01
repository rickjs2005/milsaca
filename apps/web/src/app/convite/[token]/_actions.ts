"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { validarSenha } from "@/lib/password";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import { createHash } from "node:crypto";

/**
 * Aceita convite de corretora: cria conta + senha + vincula à corretora.
 *
 * Fluxo:
 *   1. Valida token via RPC get_corretora_invite (sem auth)
 *   2. Rate limit por IP (anti-brute)
 *   3. supabase.auth.signUp com metadata role='corretora'
 *      → trigger handle_new_user já cria profile com role=corretora status=pendente
 *   4. Após sessão estar ativa, RPC consume_corretora_invite faz UPDATE
 *      no profile (corretora_id + status=ativo) e marca invite como used_at
 *   5. Redireciona pro painel da corretora
 *
 * Se mailer_autoconfirm=true (como está em prod hoje), a sessão é
 * criada no signUp. Caso contrário, manda pra /confirmar-email — mas
 * o consume tem que rodar APÓS confirmação. Por isso, se !data.session,
 * passamos pendingInvite=token via query e a tela /confirmar-email
 * chamará consume depois.
 */
export async function aceitarConvite(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) redirect("/convite/invalido");

  const errorParams = new URLSearchParams();
  if (email) errorParams.set("email", email);
  if (fullName) errorParams.set("full_name", fullName);

  function err(msg: string): never {
    errorParams.set("error", msg);
    redirect(`/convite/${token}?${errorParams.toString()}`);
  }

  if (!email.includes("@")) err("Informe um email válido.");
  if (!fullName) err("Informe seu nome completo.");
  const fraca = validarSenha(password);
  if (fraca) err(fraca);
  if (password !== confirm) err("Senhas não conferem.");

  const supabase = await createClient();

  // 1. Revalida o convite no banco antes de criar conta
  const { data: inviteRows, error: invErr } = await supabase.rpc(
    "get_corretora_invite",
    { invite_token: token },
  );
  if (invErr || !inviteRows || inviteRows.length === 0) {
    redirect("/convite/invalido");
  }
  const invite = (
    inviteRows as Array<{
      token: string;
      corretora_id: string;
      corretora_name: string;
      corretora_slug: string;
      email: string | null;
      expires_at: string;
      is_valid: boolean;
      invalid_reason: string | null;
    }>
  )[0];
  if (!invite) redirect("/convite/invalido");

  if (!invite.is_valid) {
    redirect(`/convite/invalido?reason=${invite.invalid_reason ?? "expired"}`);
  }

  // Se o invite tem email pré-definido, o email submetido tem que bater
  if (invite.email && invite.email !== email) {
    err(`Este link foi enviado pra ${invite.email}.`);
  }

  // 2. Rate limit por IP
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0]?.trim() : h.get("x-real-ip");
  const salt = process.env.LEAD_IP_SALT ?? "milsaca-signup";
  const ipKey = createHash("sha256")
    .update(`${salt}|${ip ?? "no-ip"}`)
    .digest("hex")
    .slice(0, 16);
  const rl = await checkRateLimit(`invite-accept:${ipKey}`, 10, 3600);
  if (!rl.allowed) {
    err(
      `Muitas tentativas. Tente de novo em ${Math.ceil(rl.retryAfterSeconds / 60)}min.`,
    );
  }

  // 3. signUp
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: "corretora",
      },
    },
  });

  if (signUpErr) {
    const log = await getReqLogger({
      action: "aceitarConvite",
      corretoraId: invite.corretora_id,
    });
    log.warn("convite_signup_falhou", { err: safeError(signUpErr) });
    // Pode ser email já cadastrado. Mostra mensagem genérica.
    err(
      "Não conseguimos criar a conta. Se já tem conta com esse email, faça login e entre em contato com o admin.",
    );
  }

  // 4. Vincula via RPC (mesmo se confirmação por email estiver desabilitada
  // e a sessão JÁ existe; o RPC é idempotente — marca used_at + UPDATE profile)
  const userId = signUpData?.user?.id;
  if (userId) {
    const { data: consumeRows, error: consumeErr } = await supabase.rpc(
      "consume_corretora_invite",
      { invite_token: token, consuming_user_id: userId },
    );
    if (consumeErr) {
      const log = await getReqLogger({
        action: "aceitarConvite",
        corretoraId: invite.corretora_id,
        userId,
      });
      log.error("convite_consume_falhou", { err: safeError(consumeErr) });
      err("Conta criada mas falhou ao vincular à corretora. Fale com o admin.");
    }
    const consumeResult = (
      consumeRows as Array<{
        success: boolean;
        corretora_id: string | null;
        error_msg: string | null;
      }>
    )?.[0];
    if (consumeResult && !consumeResult.success) {
      redirect(
        `/convite/invalido?reason=${consumeResult.error_msg ?? "consume_failed"}`,
      );
    }
  }

  // 5. Redireciona
  if (!signUpData.session) {
    // Email confirmation ainda obrigatório no Supabase — o consume já rodou
    // mas a sessão só virá após o user clicar/digitar OTP. Mandamos pra
    // confirmar-email com flag corretora=1 pra fluxo correto.
    redirect(
      `/confirmar-email?email=${encodeURIComponent(email)}&corretora=1`,
    );
  }

  redirect("/painel/corretora");
}
