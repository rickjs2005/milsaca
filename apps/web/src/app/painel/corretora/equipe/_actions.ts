"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";

const BASE = "/painel/corretora/equipe";

function back(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  redirect(qs ? `${BASE}?${qs}` : BASE);
}

/**
 * Gera um convite de operador pro PRÓPRIO tenant via RPC SECURITY DEFINER
 * (a RLS de corretora_invites é admin-only; a RPC libera de forma escopada).
 * O aceite reusa o fluxo público /convite/[token].
 */
export async function gerarConviteEquipe(formData: FormData) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const email =
    String(formData.get("email") ?? "").trim().toLowerCase() || null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("gerar_convite_corretora_self", {
    p_email: email ?? undefined,
  });

  if (error) {
    const log = await getReqLogger({
      action: "gerarConviteEquipe",
      corretoraId: profile.corretora_id,
    });
    log.error("convite_equipe_rpc_falhou", {
      rpc: "gerar_convite_corretora_self",
      code: error.code,
      err: safeError(error),
    });
    back({ error: friendlyPostgresError(error) });
  }
  const row = data?.[0];
  if (!row || row.error_msg) {
    back({
      error:
        row?.error_msg === "forbidden"
          ? "Você não tem permissão para convidar operadores."
          : "Não foi possível gerar o convite.",
    });
  }

  revalidatePath(BASE);
  back({ invite_token: row!.token });
}

export async function revogarConviteEquipe(formData: FormData) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const token = String(formData.get("token") ?? "").trim();
  if (!token) back({});

  const supabase = await createClient();
  const { error } = await supabase.rpc("revogar_convite_corretora_self", {
    p_token: token,
  });

  if (error) {
    const log = await getReqLogger({
      action: "revogarConviteEquipe",
      corretoraId: profile.corretora_id,
    });
    log.error("convite_equipe_revogar_rpc_falhou", {
      rpc: "revogar_convite_corretora_self",
      code: error.code,
      err: safeError(error),
    });
    back({ error: friendlyPostgresError(error) });
  }

  revalidatePath(BASE);
  back({ ok: "Convite revogado." });
}

export async function removerOperador(formData: FormData) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const target = String(formData.get("target") ?? "").trim();
  if (!target) back({});

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("remover_operador_corretora", {
    p_target: target,
  });

  if (error) {
    const log = await getReqLogger({
      action: "removerOperador",
      corretoraId: profile.corretora_id,
    });
    log.error("remover_operador_rpc_falhou", {
      rpc: "remover_operador_corretora",
      code: error.code,
      err: safeError(error),
    });
    back({ error: friendlyPostgresError(error) });
  }
  const row = data?.[0];
  if (!row?.success) {
    const map: Record<string, string> = {
      forbidden: "Você não tem permissão para remover operadores.",
      nao_pode_remover_voce: "Você não pode remover a si mesmo da equipe.",
      operador_nao_encontrado: "Operador não encontrado nesta corretora.",
    };
    back({ error: map[row?.error_msg ?? ""] ?? "Não foi possível remover." });
  }

  revalidatePath(BASE);
  back({ ok: "Operador removido da equipe." });
}
