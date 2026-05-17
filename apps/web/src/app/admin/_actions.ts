"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { requireRole } from "@/lib/auth";

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function createCorretora(formData: FormData) {
  await requireRole("admin");
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const slugInput = String(formData.get("slug") ?? "").trim();
  const verified = formData.get("verified") === "on";

  if (!name) {
    redirect("/admin/corretoras/nova?error=Nome%20obrigat%C3%B3rio");
  }

  const slug = slugify(slugInput || name);
  if (!slug) {
    redirect("/admin/corretoras/nova?error=Slug%20inv%C3%A1lido");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("corretoras")
    .insert({ name, slug, city, phone, verified });

  if (error) {
    redirect(
      `/admin/corretoras/nova?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/corretoras");
  redirect("/admin/corretoras?ok=Corretora%20criada");
}

export async function toggleCorretoraVerified(formData: FormData) {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const next = formData.get("verified") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("corretoras").update({ verified: next }).eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/admin/corretoras");
}

export async function linkProfileToCorretora(formData: FormData) {
  await requireRole("admin");
  const profileId = String(formData.get("profile_id") ?? "");
  const corretoraId = String(formData.get("corretora_id") ?? "");
  if (!profileId) return;

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({
      corretora_id: corretoraId || null,
    })
    .eq("id", profileId);
  revalidatePath("/admin");
}
