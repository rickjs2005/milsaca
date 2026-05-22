"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { friendlyPostgresError } from "@/lib/postgres-error";

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function readFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || null;
  const state = String(formData.get("state") ?? "").trim().toUpperCase();
  const region_group = String(formData.get("region_group") ?? "").trim() || null;
  const active = formData.get("active") === "on";
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const slug =
    String(formData.get("slug") ?? "").trim() ||
    slugify(`${name}-${state}`);

  const errors: string[] = [];
  if (!name) errors.push("Nome obrigatório.");
  if (state.length !== 2) errors.push("UF deve ter 2 letras.");

  return {
    errors,
    fields: { name, city, state, region_group, active, notes, slug },
  };
}

export async function createPraca(formData: FormData) {
  const user = await requireAppAdmin();
  const { errors, fields } = readFields(formData);
  if (errors.length > 0) {
    redirect(
      `/admin/cotacoes/pracas/nova?error=${encodeURIComponent(errors.join(" "))}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("pracas").insert(fields);
  if (error) {
    redirect(
      `/admin/cotacoes/pracas/nova?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "create_praca",
    entity: "pracas",
    payload: { slug: fields.slug, state: fields.state },
  });

  revalidatePath("/admin/cotacoes/pracas");
  redirect("/admin/cotacoes/pracas?ok=Pra%C3%A7a%20criada");
}

export async function updatePraca(formData: FormData) {
  const user = await requireAppAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/cotacoes/pracas?error=ID%20inv%C3%A1lido");
  const { errors, fields } = readFields(formData);
  if (errors.length > 0) {
    redirect(
      `/admin/cotacoes/pracas/${id}?error=${encodeURIComponent(errors.join(" "))}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("pracas").update(fields).eq("id", id);
  if (error) {
    redirect(
      `/admin/cotacoes/pracas/${id}?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "update_praca",
    entity: "pracas",
    entity_id: id,
    payload: { slug: fields.slug },
  });

  revalidatePath("/admin/cotacoes/pracas");
  redirect(`/admin/cotacoes/pracas/${id}?saved=1`);
}

export async function togglePracaActive(formData: FormData) {
  const user = await requireAppAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const next = formData.get("active") === "true";
  if (!id) redirect("/admin/cotacoes/pracas?error=ID%20inv%C3%A1lido");

  const supabase = await createClient();
  const { error } = await supabase
    .from("pracas")
    .update({ active: next })
    .eq("id", id);
  if (error) {
    redirect(
      `/admin/cotacoes/pracas?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: next ? "activate_praca" : "deactivate_praca",
    entity: "pracas",
    entity_id: id,
  });

  revalidatePath("/admin/cotacoes/pracas");
  redirect(
    `/admin/cotacoes/pracas?ok=${next ? "Pra%C3%A7a%20ativada" : "Pra%C3%A7a%20desativada"}`,
  );
}
