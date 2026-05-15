import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import type { Profile, UserRole } from "@milsaca/types";

/**
 * Retorna o user autenticado (server-side).
 * Use SEMPRE getUser() — nunca getSession() — em código de servidor.
 * Retorna null se não houver sessão válida.
 */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Como `getUser`, mas redireciona para /entrar se não houver sessão.
 */
export async function requireUser(redirectTo = "/painel") {
  const user = await getUser();
  if (!user) {
    redirect(`/entrar?redirectTo=${encodeURIComponent(redirectTo)}`);
  }
  return user;
}

/**
 * Lê o profile do usuário autenticado a partir da tabela `profiles`.
 */
export async function getProfile(): Promise<Profile | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  return data ?? null;
}

/**
 * Garante que o usuário autenticado tenha um dos roles informados.
 * Caso contrário, redireciona para a home.
 */
export async function requireRole(...allowed: UserRole[]) {
  const profile = await getProfile();
  if (!profile) {
    redirect("/entrar");
  }
  if (!allowed.includes(profile.role)) {
    redirect("/");
  }
  return profile;
}

/**
 * Decide o destino padrão pós-login a partir do role.
 */
export function defaultRouteFor(role: UserRole) {
  switch (role) {
    case "admin":
      return "/admin";
    case "corretora":
      return "/painel/corretora";
    case "produtor":
      return "/painel/produtor";
  }
}
