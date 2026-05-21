"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { friendlyPostgresError } from "@/lib/postgres-error";

/**
 * Maps job kind → SQL function name. Adicione aqui ao criar novo job.
 * Apenas jobs com função SQL plugada aparecem com botão "Rodar agora".
 */
const RUNNABLE: Record<string, string> = {
  "cron.expire-trials.run": "expire_trials",
  "cron.expire-subscriptions.run": "expire_subscriptions",
  "cron.nudge-trial-ending.run": "nudge_trial_ending",
  "cron.nudge-stale-leads.run": "nudge_stale_leads",
  "cron.nudge-delivery-late.run": "nudge_delivery_late",
  "cron.process-dispatches.run": "process_pending_dispatches",
};

export async function triggerJob(formData: FormData) {
  const user = await requireAppAdmin();
  const kind = String(formData.get("kind") ?? "").trim();

  const fn = RUNNABLE[kind];
  if (!fn) {
    redirect(
      `/admin/automacoes?error=${encodeURIComponent(`Job desconhecido: ${kind}`)}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc(fn);

  if (error) {
    const friendly = friendlyPostgresError(error);
    redirect(
      `/admin/automacoes?error=${encodeURIComponent(`Falha ao rodar ${kind}: ${friendly}`)}`,
    );
  }

  // A própria função SQL grava system_event de success. Aqui só registra
  // auditoria humana de que o admin disparou manualmente.
  await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "trigger_job",
    entity: "system_events",
    payload: { kind, function: fn },
  });

  revalidatePath("/admin/automacoes");
  revalidatePath("/admin/fila-eventos");
  redirect(`/admin/automacoes?ok=${encodeURIComponent(`${kind} executado`)}`);
}
