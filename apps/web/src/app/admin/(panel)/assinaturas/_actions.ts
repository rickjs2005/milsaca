"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { requireAppAdmin } from "@/lib/auth";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import { friendlyPostgresError } from "../_lib/errors";
import {
  flattenZodErrors,
  formDataToObject,
  subscriptionIdSchema,
  updateSubscriptionSchema,
} from "../_lib/schemas";

function dateInputToIso(v: string | null): string | null {
  if (!v) return null;
  // input type="date" devolve YYYY-MM-DD; armazenamos como ISO no final do dia
  return new Date(`${v}T23:59:59`).toISOString();
}

export async function updateSubscription(formData: FormData) {
  const actor = await requireAppAdmin();

  const parsed = updateSubscriptionSchema.safeParse(
    formDataToObject(formData),
  );
  if (!parsed.success) {
    const id = String(formData.get("id") ?? "");
    redirect(
      `/admin/assinaturas/${id || ""}?error=${encodeURIComponent(flattenZodErrors(parsed.error))}`,
    );
  }
  const { id, status, plan_id, trial_ends_at, current_period_end, notes } =
    parsed.data;

  const supabase = await createClient();
  // Atômico: a RPC faz o UPDATE da subscription + o INSERT no audit_log numa
  // única transação (migration 20261030).
  const { error } = await supabase.rpc("admin_update_subscription", {
    p_id: id,
    p_status: status,
    p_plan_id: plan_id,
    p_trial_ends_at: dateInputToIso(trial_ends_at),
    p_current_period_end: dateInputToIso(current_period_end),
    p_notes: notes ?? null,
  });

  if (error) {
    const log = await getReqLogger({
      action: "updateSubscription",
      userId: actor.id,
      entityId: id,
    });
    log.error("subscription_update_falhou", {
      code: error.code,
      err: safeError(error),
    });
    redirect(
      `/admin/assinaturas/${id}?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  revalidatePath("/admin/assinaturas");
  revalidatePath(`/admin/assinaturas/${id}`);
  redirect(`/admin/assinaturas/${id}?saved=1`);
}

/**
 * Marca como paga: status='active' e estende current_period_end
 * conforme billing_period do plano (mensal +1 mês, anual +1 ano).
 */
export async function markSubscriptionPaid(formData: FormData) {
  const actor = await requireAppAdmin();

  const parsed = subscriptionIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return;
  const { id } = parsed.data;

  const supabase = await createClient();

  // Renovação atômica no banco (migration 20260624000000): o novo período
  // é calculado dentro do UPDATE a partir de greatest(period_end, now()),
  // eliminando o read-modify-write não-atômico (achado 2.6).
  const { data, error } = await supabase.rpc("mark_subscription_paid", {
    p_id: id,
  });

  if (error) {
    const log = await getReqLogger({
      action: "markSubscriptionPaid",
      userId: actor.id,
      entityId: id,
    });
    log.error("subscription_paid_falhou", {
      code: error.code,
      err: safeError(error),
    });
    redirect(
      `/admin/assinaturas/${id}?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  const newEnd = typeof data === "string" ? data : null;

  const { error: auditErr } = await supabase.from("audit_log").insert({
    actor_id: actor.id,
    action: "subscription_paid",
    entity: "subscription",
    entity_id: id,
    payload: { new_period_end: newEnd },
  });
  if (auditErr) {
    const log = await getReqLogger({
      action: "markSubscriptionPaid",
      userId: actor.id,
      entityId: id,
    });
    log.warn("audit_insert_falhou", { err: safeError(auditErr) });
  }

  revalidatePath("/admin/assinaturas");
  revalidatePath(`/admin/assinaturas/${id}`);
  redirect(
    "/admin/assinaturas?ok=" +
      encodeURIComponent("Assinatura renovada"),
  );
}

export async function cancelSubscription(formData: FormData) {
  const actor = await requireAppAdmin();

  const parsed = subscriptionIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return;
  const { id } = parsed.data;

  const supabase = await createClient();
  // Atômico: cancela + audit numa transação (migration 20261030).
  const { error } = await supabase.rpc("admin_cancel_subscription", {
    p_id: id,
  });
  if (error) {
    const log = await getReqLogger({
      action: "cancelSubscription",
      userId: actor.id,
      entityId: id,
    });
    log.error("subscription_cancel_falhou", {
      code: error.code,
      err: safeError(error),
    });
    redirect(
      `/admin/assinaturas/${id}?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  revalidatePath("/admin/assinaturas");
  revalidatePath(`/admin/assinaturas/${id}`);
  redirect(
    "/admin/assinaturas?ok=" + encodeURIComponent("Assinatura cancelada"),
  );
}
