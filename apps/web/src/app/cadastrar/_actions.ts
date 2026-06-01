"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { defaultRouteFor } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  citySchema,
  cnpjSchema,
  ufSchema,
  whatsappOptionalSchema,
} from "@/lib/brasil-schemas";
import { getFounderProgramStatus } from "@/lib/founder-program";
import { POLITICA_VERSAO, TERMOS_VERSAO } from "@/lib/legal";
import { validarSenha } from "@/lib/password";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import { createHash } from "node:crypto";
import type { Profile } from "@milsaca/types";

type RoleChoice = "produtor" | "corretora";

function clean(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

/**
 * Cadastro com email + senha. O role é escolhido no form:
 *   - produtor: já vira ativo, cai no painel após confirmar email
 *   - corretora: vira pendente; admin precisa aprovar (criar registro
 *     em `corretoras` + vincular profile + marcar status=ativo).
 *
 * O trigger handle_new_user lê raw_user_meta_data.role e seta o status
 * adequado em profiles. Pra signup como corretora, guardamos os dados
 * preliminares da empresa em raw_user_meta_data.corretora_*; admin
 * usa esses valores como sugestão ao aprovar.
 */
export async function signUp(formData: FormData) {
  const roleRaw = String(formData.get("role") ?? "produtor");
  const role: RoleChoice = roleRaw === "corretora" ? "corretora" : "produtor";

  // Programa de fundadoras: se o cadastro de corretora está fechado ou as
  // vagas acabaram, manda pra lista de espera em vez de criar conta pendente.
  if (role === "corretora") {
    const founder = await getFounderProgramStatus();
    if (!founder.accepting) {
      redirect("/corretoras/espera");
    }
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const fullName = clean(formData.get("full_name"));

  // Campos extras quando role=corretora — cnpj/uf/cidade/whatsapp passam
  // por schemas Zod com DV-check + normalização. UI manda já normalizado
  // via MaskedInput hidden, mas re-normalizamos no server por defesa.
  const corretoraName = clean(formData.get("corretora_name"));
  const corretoraCnpjRaw = String(formData.get("corretora_cnpj") ?? "");
  const corretoraCityRaw = String(formData.get("corretora_city") ?? "");
  const corretoraUfRaw = String(formData.get("corretora_uf") ?? "");
  const corretoraWhatsappRaw = String(
    formData.get("corretora_whatsapp") ?? "",
  );

  const params = new URLSearchParams({ role });
  if (email) params.set("email", email);
  if (fullName) params.set("full_name", fullName);
  if (corretoraName) params.set("corretora_name", corretoraName);
  if (corretoraCityRaw) params.set("corretora_city", corretoraCityRaw);
  if (corretoraUfRaw) params.set("corretora_uf", corretoraUfRaw);
  if (corretoraWhatsappRaw)
    params.set("corretora_whatsapp", corretoraWhatsappRaw);

  const missing: string[] = [];
  if (!fullName) missing.push("nome");
  if (!email) missing.push("email");
  if (!password) missing.push("senha");
  if (role === "corretora") {
    if (!corretoraName) missing.push("nome da corretora");
  }
  if (missing.length > 0) {
    params.set("error", "Preencha: " + missing.join(", "));
    redirect(`/cadastrar?${params.toString()}`);
  }
  const fraca = validarSenha(password);
  if (fraca) {
    params.set("error", fraca);
    redirect(`/cadastrar?${params.toString()}`);
  }
  if (password !== confirm) {
    params.set("error", "Senhas não conferem");
    redirect(`/cadastrar?${params.toString()}`);
  }

  // Valida dados da corretora com DV check / UF enum / cidade limpa.
  // Pra produtor esses campos são ignorados.
  let corretoraCnpj: string | null = null;
  let corretoraCity: string | null = null;
  let corretoraUf: string | null = null;
  let corretoraWhatsapp: string | null = null;
  if (role === "corretora") {
    const cnpjParsed = cnpjSchema.safeParse(corretoraCnpjRaw);
    if (!cnpjParsed.success) {
      params.set("error", "Informe um CNPJ válido (com DV correto).");
      redirect(`/cadastrar?${params.toString()}`);
    }
    corretoraCnpj = cnpjParsed.data;

    const cityParsed = citySchema.safeParse(corretoraCityRaw);
    if (!cityParsed.success) {
      params.set(
        "error",
        cityParsed.error.issues[0]?.message ?? "Cidade inválida.",
      );
      redirect(`/cadastrar?${params.toString()}`);
    }
    corretoraCity = cityParsed.data;

    const ufParsed = ufSchema.safeParse(corretoraUfRaw);
    if (!ufParsed.success) {
      params.set("error", "Selecione o estado.");
      redirect(`/cadastrar?${params.toString()}`);
    }
    corretoraUf = ufParsed.data;

    const waParsed = whatsappOptionalSchema.safeParse(corretoraWhatsappRaw);
    if (!waParsed.success) {
      params.set("error", "Informe um WhatsApp válido (com DDD).");
      redirect(`/cadastrar?${params.toString()}`);
    }
    corretoraWhatsapp = waParsed.data;
  }

  const lgpdConsent = formData.get("lgpd_consent") === "on";
  if (!lgpdConsent) {
    params.set("error", "Aceite a Política de Privacidade pra continuar.");
    redirect(`/cadastrar?${params.toString()}`);
  }

  // Rate limit por IP: 10 tentativas/hora. Bloqueia spam de cadastro
  // sem punir o mesmo email que erra de propósito (anti-enumeration).
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0]?.trim() : h.get("x-real-ip");
  const salt = process.env.LEAD_IP_SALT ?? "milsaca-signup";
  const ipKey = createHash("sha256")
    .update(`${salt}|${ip ?? "no-ip"}`)
    .digest("hex")
    .slice(0, 16);
  const rl = await checkRateLimit(`signup:${ipKey}`, 10, 3600);
  if (!rl.allowed) {
    params.set(
      "error",
      `Muitas tentativas de cadastro. Tente de novo em ${Math.ceil(rl.retryAfterSeconds / 60)}min.`,
    );
    redirect(`/cadastrar?${params.toString()}`);
  }

  const supabase = await createClient();
  const metadata: Record<string, unknown> = {
    full_name: fullName,
    role,
  };
  if (role === "corretora") {
    metadata.corretora_name = corretoraName;
    metadata.corretora_cnpj = corretoraCnpj;
    metadata.corretora_city = corretoraCity;
    metadata.corretora_uf = corretoraUf;
    if (corretoraWhatsapp) metadata.corretora_whatsapp = corretoraWhatsapp;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  });

  if (error) {
    // Anti-enumeration ESTRITO: mensagem totalmente genérica, sem variar
    // por tipo do erro. Variar (ex.: "senha fraca" vs "erro genérico")
    // permite ao atacante usar /cadastrar como oráculo de email existente
    // — bastaria mandar senhas diferentes e ver qual ramo dispara.
    // Mensagem técnica vai só pro log (não vaza pro usuário).
    const log = await getReqLogger({ action: "signUp", role });
    log.warn("signup_falhou", { err: safeError(error) });
    params.set(
      "error",
      "Não foi possível concluir o cadastro. Verifique os dados e tente novamente em alguns minutos.",
    );
    redirect(`/cadastrar?${params.toString()}`);
  }

  // Registra consentimento LGPD (best-effort; falha não tomba signup).
  // profile_id pode ser null se confirmação por email exigir clique
  // antes da sessão existir — gravamos com email pra reconciliar depois.
  // Versões vêm de @/lib/legal (fonte única — achado 3.7).
  await supabase.from("lgpd_consents").insert([
    {
      profile_id: data.user?.id ?? null,
      email,
      kind: "politica_privacidade",
      version: POLITICA_VERSAO,
      granted: true,
      ip_hash: ipKey,
      user_agent: h.get("user-agent")?.slice(0, 500) ?? null,
      metadata: { role, signup_at: new Date().toISOString() },
    },
    {
      profile_id: data.user?.id ?? null,
      email,
      kind: "termos_uso",
      version: TERMOS_VERSAO,
      granted: true,
      ip_hash: ipKey,
      user_agent: h.get("user-agent")?.slice(0, 500) ?? null,
      metadata: { role },
    },
  ]);

  // Corretora signup → trigger seta status=pendente. Se tem sessão
  // (confirmation desabilitada no Supabase), pula direto pra espera.
  // Caso contrário, manda pra confirmar email primeiro — depois sim
  // a tela /confirmar-email redireciona pra /aguardando-aprovacao.
  if (role === "corretora") {
    if (data.session) {
      redirect(`/aguardando-aprovacao?email=${encodeURIComponent(email)}`);
    }
    redirect(
      `/confirmar-email?email=${encodeURIComponent(email)}&corretora=1`,
    );
  }

  // Produtor signup sem sessão → tela de confirmação por OTP
  if (!data.session) {
    redirect(`/confirmar-email?email=${encodeURIComponent(email)}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?error=Sess%C3%A3o%20inv%C3%A1lida");

  const { data: profile } = await supabase
    .from("profiles")
    .select("roles")
    .eq("id", user.id)
    .single<Pick<Profile, "roles">>();

  redirect(profile?.roles?.length ? defaultRouteFor(profile) : "/painel");
}
