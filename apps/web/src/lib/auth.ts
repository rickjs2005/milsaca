import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import type { Profile, UserRole } from "@milsaca/types";

const ACTIVE_ROLE_COOKIE = "mp_active_role";

/**
 * User autenticado (server-side). Use SEMPRE getUser() — nunca getSession().
 */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Redireciona para /entrar se não houver sessão.
 */
export async function requireUser(redirectTo = "/painel") {
  const user = await getUser();
  if (!user) {
    redirect(`/entrar?redirectTo=${encodeURIComponent(redirectTo)}`);
  }
  return user;
}

/**
 * Lê o profile do user autenticado.
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
 * Garante que o user logado tenha pelo menos um dos papéis informados
 * (em qualquer entrada de profile.roles). Caso contrário, redireciona.
 */
export async function requireRole(...allowed: UserRole[]) {
  const profile = await getProfile();
  if (!profile) {
    redirect("/entrar");
  }
  const has = profile.roles.some((r) => allowed.includes(r));
  if (!has) {
    redirect("/");
  }
  return profile;
}

/**
 * Lê o cookie de modo ativo (qual painel o user escolheu usar agora).
 */
export async function getActiveRole(): Promise<UserRole | null> {
  const store = await cookies();
  const value = store.get(ACTIVE_ROLE_COOKIE)?.value;
  if (value === "produtor" || value === "corretora" || value === "admin") {
    return value;
  }
  return null;
}

/**
 * Decide pra qual painel mandar o user logo após login (verifyOtp).
 * - 1 papel ativo: vai direto pro painel correspondente.
 * - 2+ papéis: vai pra /painel/escolher e o user decide.
 */
export function defaultRouteFor(profile: Pick<Profile, "roles">) {
  if (profile.roles.length === 0) return "/";
  if (profile.roles.length === 1) {
    const only = profile.roles[0];
    if (!only) return "/";
    return panelFor(only);
  }
  return "/painel/escolher";
}

/**
 * Rota do painel para um papel específico.
 */
export function panelFor(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "corretora":
      return "/painel/corretora";
    case "produtor":
      return "/painel/produtor";
  }
}

export const ACTIVE_ROLE_COOKIE_NAME = ACTIVE_ROLE_COOKIE;
