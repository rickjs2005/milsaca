"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { requireAppAdmin } from "@/lib/auth";
import { friendlyPostgresError } from "../_lib/errors";
import { flattenZodErrors, planSchema, uuidSchema } from "../_lib/schemas";

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function parseFeatures(v: FormDataEntryValue | null): string[] {
  if (v == null) return [];
  return String(v)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function reaisToCents(v: FormDataEntryValue | null): number {
  // aceita "123,45", "123.45", "12345"
  const raw = String(v ?? "")
    .replace(/[^0-9,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function readPlanForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    description: formData.get("description"),
    price_cents: reaisToCents(formData.get("price")),
    billing_period: formData.get("billing_period"),
    features: parseFeatures(formData.get("features")),
    active: formData.get("active") === "on",
  };
}

export async function createPlano(formData: FormData) {
  const actor = await requireAppAdmin();

  const parsed = planSchema.safeParse(readPlanForm(formData));
  if (!parsed.success) {
    redirect(
      `/admin/planos/novo?error=${encodeURIComponent(flattenZodErrors(parsed.error))}`,
    );
  }
  const fields = parsed.data;

  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || fields.name);
  if (!slug) {
    redirect(
      `/admin/planos/novo?error=${encodeURIComponent("Não consegui gerar slug a partir do nome.")}`,
    );
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("plans")
    .insert({ ...fields, slug })
    .select("id")
    .single();

  if (error || !created) {
    redirect(
      `/admin/planos/novo?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  await supabase.from("audit_log").insert({
    actor_id: actor.id,
    action: "create_plan",
    entity: "plan",
    entity_id: created.id,
    payload: {
      name: fields.name,
      slug,
      price_cents: fields.price_cents,
      billing_period: fields.billing_period,
    },
  });

  revalidatePath("/admin/planos");
  redirect("/admin/planos?ok=" + encodeURIComponent("Plano criado"));
}

export async function updatePlano(formData: FormData) {
  const actor = await requireAppAdmin();

  const idParsed = uuidSchema.safeParse(String(formData.get("id") ?? "").trim());
  if (!idParsed.success) redirect("/admin/planos");
  const id = idParsed.data;

  const parsed = planSchema.safeParse(readPlanForm(formData));
  if (!parsed.success) {
    redirect(
      `/admin/planos/${id}?error=${encodeURIComponent(flattenZodErrors(parsed.error))}`,
    );
  }
  const fields = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("plans").update(fields).eq("id", id);

  if (error) {
    redirect(
      `/admin/planos/${id}?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  await supabase.from("audit_log").insert({
    actor_id: actor.id,
    action: "update_plan",
    entity: "plan",
    entity_id: id,
    payload: {
      name: fields.name,
      price_cents: fields.price_cents,
      billing_period: fields.billing_period,
      active: fields.active,
    },
  });

  revalidatePath("/admin/planos");
  revalidatePath(`/admin/planos/${id}`);
  redirect(`/admin/planos/${id}?saved=1`);
}

export async function togglePlanoActive(formData: FormData) {
  const actor = await requireAppAdmin();

  const idParsed = uuidSchema.safeParse(String(formData.get("id") ?? ""));
  if (!idParsed.success) return;
  const id = idParsed.data;
  const next = formData.get("active") === "true";

  const supabase = await createClient();
  await supabase.from("plans").update({ active: next }).eq("id", id);

  await supabase.from("audit_log").insert({
    actor_id: actor.id,
    action: next ? "activate_plan" : "deactivate_plan",
    entity: "plan",
    entity_id: id,
    payload: { active: next },
  });

  revalidatePath("/admin/planos");
}
