import { redirect } from "next/navigation";
import {
  defaultRouteFor,
  enforceProfileStatus,
  getProfile,
  isAppAdmin,
  requireUser,
} from "@/lib/auth";

/**
 * Fallback do /painel sem subrota. Ações como redefinir-senha, callbacks
 * de OTP e qualquer redirect("/painel") legado caem aqui em vez de 404.
 *
 * Ordem:
 *   1. Sem sessão → /entrar.
 *   2. Status diferente de ativo → /aguardando-aprovacao ou /entrar?error=.
 *   3. App admin → /admin.
 *   4. Roles do profile → defaultRouteFor (painel ou /painel/escolher).
 *   5. Estado degenerado (logado sem roles) → /painel/escolher, que mostra UX
 *      adequada em vez de 404.
 *
 * NÃO renderiza UI — sempre redireciona. Marca explicit dynamic pra não
 * tentar prerender.
 */
export const dynamic = "force-dynamic";

export default async function PainelIndex() {
  await requireUser("/painel");
  const profile = await getProfile();
  enforceProfileStatus(profile);

  if (await isAppAdmin()) redirect("/admin");

  if (profile && profile.roles.length > 0) {
    redirect(defaultRouteFor(profile));
  }

  redirect("/painel/escolher");
}
