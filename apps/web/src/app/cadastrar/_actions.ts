"use server";

import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { defaultRouteFor } from "@/lib/auth";
import type { Profile } from "@milsaca/types";

const MIN_PASSWORD = 8;

type RoleChoice = "produtor" | "corretora";

function clean(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function cleanDigits(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").replace(/\D/g, "");
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

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const fullName = clean(formData.get("full_name"));

  // Campos extras quando role=corretora
  const corretoraName = clean(formData.get("corretora_name"));
  const corretoraCnpj = cleanDigits(formData.get("corretora_cnpj"));
  const corretoraCity = clean(formData.get("corretora_city"));

  const params = new URLSearchParams({ role });
  if (email) params.set("email", email);
  if (fullName) params.set("full_name", fullName);
  if (corretoraName) params.set("corretora_name", corretoraName);
  if (corretoraCity) params.set("corretora_city", corretoraCity);

  const missing: string[] = [];
  if (!fullName) missing.push("nome");
  if (!email) missing.push("email");
  if (!password) missing.push("senha");
  if (role === "corretora") {
    if (!corretoraName) missing.push("nome da corretora");
    if (!corretoraCnpj) missing.push("CNPJ");
    if (!corretoraCity) missing.push("cidade da corretora");
  }
  if (missing.length > 0) {
    params.set("error", "Preencha: " + missing.join(", "));
    redirect(`/cadastrar?${params.toString()}`);
  }
  if (password.length < MIN_PASSWORD) {
    params.set("error", `Senha precisa ter pelo menos ${MIN_PASSWORD} caracteres`);
    redirect(`/cadastrar?${params.toString()}`);
  }
  if (password !== confirm) {
    params.set("error", "Senhas não conferem");
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
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  });

  if (error) {
    params.set("error", error.message);
    redirect(`/cadastrar?${params.toString()}`);
  }

  // Corretora signup → trigger seta status=pendente; user vê
  // /aguardando-aprovacao independente de confirmação de email
  if (role === "corretora") {
    const ok =
      "Cadastro recebido. Em até 24h um administrador valida sua corretora e libera o acesso.";
    if (data.session) {
      // Já logado (confirmação desabilitada): vai pra tela de espera
      redirect(`/aguardando-aprovacao?email=${encodeURIComponent(email)}`);
    }
    redirect(`/entrar?ok=${encodeURIComponent(ok)}&email=${encodeURIComponent(email)}`);
  }

  // Produtor signup
  if (!data.session) {
    const ok = `Conta criada. Confira o link de confirmação no email ${email}.`;
    redirect(`/entrar?ok=${encodeURIComponent(ok)}&email=${encodeURIComponent(email)}`);
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
