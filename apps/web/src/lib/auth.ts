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
  // maybeSingle: ausência de profile (signup em andamento pelo trigger, estado
  // transitório) não é erro — `.single()` lançaria erro do PostgREST em 0 linhas.
  // Alinha com o fetchProfile do mobile (que já usa maybeSingle).
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return data ?? null;
}

/**
 * Manda quem não tem `profile.status='ativo'` para a tela correspondente,
 * antes de qualquer gate de painel/onboarding.
 *   - pendente  → /aguardando-aprovacao
 *   - bloqueado → /entrar com mensagem
 */
export function enforceProfileStatus(profile: Pick<Profile, "status"> | null) {
  if (!profile) return;
  if (profile.status === "pendente") {
    redirect("/aguardando-aprovacao");
  }
  if (profile.status === "bloqueado") {
    redirect(
      `/entrar?error=${encodeURIComponent("Sua conta está suspensa. Fale com o suporte.")}`,
    );
  }
}

/**
 * Garante que o user logado tenha pelo menos um dos papéis informados
 * (em qualquer entrada de profile.roles). Caso contrário, redireciona.
 *
 * NÃO use pra checar admin — admin não é mais um user_role, é entry
 * em public.app_admins. Use requireAppAdmin() pra isso.
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
 * Operador da plataforma (Rick). Não é cliente.
 * Implementado via tabela app_admins + função is_app_admin() — não tem
 * nada a ver com profile.role ou profile.roles. Quem entra em app_admins
 * é provisionado manualmente.
 */
export async function isAppAdmin(): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_app_admin");
  return data === true;
}

export async function requireAppAdmin() {
  const user = await getUser();
  if (!user) {
    redirect("/admin/login");
  }
  const ok = await isAppAdmin();
  if (!ok) {
    redirect("/admin/login?error=" +
      encodeURIComponent("Esta conta não tem acesso ao admin."));
  }
  return user;
}

/**
 * Decide pra qual painel mandar o user logo após login.
 * - 1 papel: vai direto pro painel correspondente.
 * - 2+ papéis: vai pra /painel/escolher.
 *
 * Admin é tratado separadamente no /entrar action: se isAppAdmin(),
 * vai pra /admin antes de chegar aqui.
 */
export function defaultRouteFor(profile: Pick<Profile, "roles">) {
  const clientRoles = profile.roles.filter(
    (r): r is "produtor" | "corretora" => r === "produtor" || r === "corretora",
  );
  if (clientRoles.length === 0) return "/";
  if (clientRoles.length === 1) {
    return panelFor(clientRoles[0]!);
  }
  return "/painel/escolher";
}

/**
 * Rota do painel para um papel específico.
 */
export function panelFor(role: "produtor" | "corretora"): string {
  switch (role) {
    case "corretora":
      return "/painel/corretora";
    case "produtor":
      return "/painel/produtor";
  }
}

export const ACTIVE_ROLE_COOKIE_NAME = ACTIVE_ROLE_COOKIE;
