"use server";

import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { defaultRouteFor } from "@/lib/auth";
import type { Profile } from "@milsaca/types";

const MIN_PASSWORD = 8;

/**
 * Cadastro com email + senha. Cria o user em auth.users e o trigger
 * handle_new_user cria o profile correspondente com role default
 * produtor (vem do raw_user_meta_data.role).
 *
 * Se o Supabase exigir confirmação de email (padrão), a sessão NÃO
 * é criada até o link ser clicado — usuário fica em /cadastrar com
 * mensagem "verifique seu email". Senão, já cai no painel.
 */
export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  const params = new URLSearchParams();
  if (email) params.set("email", email);
  if (fullName) params.set("full_name", fullName);

  if (!email || !password || !fullName) {
    params.set("error", "Preencha nome, email e senha");
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
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: "produtor",
      },
    },
  });

  if (error) {
    params.set("error", error.message);
    redirect(`/cadastrar?${params.toString()}`);
  }

  // Sem sessão = confirmação de email obrigatória
  if (!data.session) {
    const ok = `Conta criada. Confira o link de confirmação no email ${email}.`;
    redirect(`/entrar?ok=${encodeURIComponent(ok)}&email=${encodeURIComponent(email)}`);
  }

  // Já está logado — decide destino pelos papéis
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
