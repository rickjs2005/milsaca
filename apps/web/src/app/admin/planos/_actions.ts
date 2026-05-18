"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { requireAppAdmin } from "@/lib/auth";

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function clean(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
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

type Period = "monthly" | "yearly";

function readPlanForm(formData: FormData) {
  const periodRaw = String(formData.get("billing_period") ?? "monthly");
  const billing_period: Period =
    periodRaw === "yearly" ? "yearly" : "monthly";
  return {
    name: String(formData.get("name") ?? "").trim(),
    description: clean(formData.get("description")),
    price_cents: reaisToCents(formData.get("price")),
    billing_period,
    features: parseFeatures(formData.get("features")),
    active: formData.get("active") === "on",
  };
}

export async function createPlano(formData: FormData) {
  await requireAppAdmin();
  const fields = readPlanForm(formData);
  const slugInput = String(formData.get("slug") ?? "").trim();

  if (!fields.name) {
    redirect("/admin/planos/novo?error=" + encodeURIComponent("Nome obrigatório"));
  }
  const slug = slugify(slugInput || fields.name);
  if (!slug) {
    redirect("/admin/planos/novo?error=" + encodeURIComponent("Slug inválido"));
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("plans")
    .insert({ ...fields, slug });

  if (error) {
    redirect(
      `/admin/planos/novo?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/admin/planos");
  redirect("/admin/planos?ok=" + encodeURIComponent("Plano criado"));
}

export async function updatePlano(formData: FormData) {
  await requireAppAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/planos");

  const fields = readPlanForm(formData);
  if (!fields.name) {
    redirect(`/admin/planos/${id}?error=${encodeURIComponent("Nome obrigatório")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("plans")
    .update(fields)
    .eq("id", id);

  if (error) {
    redirect(`/admin/planos/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/planos");
  revalidatePath(`/admin/planos/${id}`);
  redirect(`/admin/planos/${id}?saved=1`);
}

export async function togglePlanoActive(formData: FormData) {
  await requireAppAdmin();
  const id = String(formData.get("id") ?? "");
  const next = formData.get("active") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("plans").update({ active: next }).eq("id", id);
  revalidatePath("/admin/planos");
}
