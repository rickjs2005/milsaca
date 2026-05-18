"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { requireAppAdmin } from "@/lib/auth";
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
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status,
      plan_id,
      trial_ends_at: dateInputToIso(trial_ends_at),
      current_period_end: dateInputToIso(current_period_end),
      canceled_at: status === "canceled" ? new Date().toISOString() : null,
      notes,
    })
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/assinaturas/${id}?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  await supabase.from("audit_log").insert({
    actor_id: actor.id,
    action: "update_subscription",
    entity: "subscription",
    entity_id: id,
    payload: { status, plan_id },
  });

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
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, plan_id, current_period_end, plans(billing_period)")
    .eq("id", id)
    .single();
  if (!sub) return;

  type SubRow = {
    id: string;
    plan_id: string | null;
    current_period_end: string | null;
    plans: { billing_period: "monthly" | "yearly" } | null;
  };
  const row = sub as unknown as SubRow;

  const period = row.plans?.billing_period ?? "monthly";
  const base = row.current_period_end && new Date(row.current_period_end) > new Date()
    ? new Date(row.current_period_end)
    : new Date();
  const newEnd = new Date(base);
  if (period === "yearly") {
    newEnd.setFullYear(newEnd.getFullYear() + 1);
  } else {
    newEnd.setMonth(newEnd.getMonth() + 1);
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: newEnd.toISOString(),
      canceled_at: null,
    })
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/assinaturas/${id}?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  await supabase.from("audit_log").insert({
    actor_id: actor.id,
    action: "subscription_paid",
    entity: "subscription",
    entity_id: id,
    payload: { new_period_end: newEnd.toISOString(), period },
  });

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
  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
    })
    .eq("id", id);

  await supabase.from("audit_log").insert({
    actor_id: actor.id,
    action: "subscription_canceled",
    entity: "subscription",
    entity_id: id,
    payload: {},
  });

  revalidatePath("/admin/assinaturas");
  revalidatePath(`/admin/assinaturas/${id}`);
  redirect(
    "/admin/assinaturas?ok=" + encodeURIComponent("Assinatura cancelada"),
  );
}
