"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { getReqLogger } from "@/lib/req-logger";
import { safeError } from "@/lib/logger";

const SPECIES = ["arabica", "conilon", "robusta", "cacau", "pimenta", "outro"] as const;
const PROCESSES = [
  "natural",
  "cereja_descascado",
  "cd_desmucilado",
  "despolpado",
  "fermentacao_induzida",
  "lavado",
  "outro",
] as const;
const UNITS = ["saca_60kg", "kg", "arroba", "libra", "tonelada"] as const;

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
  const species = String(formData.get("species") ?? "").trim();
  const processRaw = String(formData.get("process") ?? "").trim() || null;
  const default_unit = String(formData.get("default_unit") ?? "saca_60kg").trim();
  const active = formData.get("active") === "on";
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const slug = String(formData.get("slug") ?? "").trim() || slugify(name);

  const errors: string[] = [];
  if (!name) errors.push("Nome obrigatório.");
  if (!(SPECIES as readonly string[]).includes(species)) errors.push("Espécie inválida.");
  if (processRaw && !(PROCESSES as readonly string[]).includes(processRaw))
    errors.push("Processo inválido.");
  if (!(UNITS as readonly string[]).includes(default_unit))
    errors.push("Unidade inválida.");

  return {
    errors,
    fields: { name, slug, species, process: processRaw, default_unit, active, notes },
  };
}

export async function createCoffeeType(formData: FormData) {
  const user = await requireAppAdmin();
  const { errors, fields } = readFields(formData);
  if (errors.length > 0) {
    redirect(
      `/admin/cotacoes/tipos/nova?error=${encodeURIComponent(errors.join(" "))}`,
    );
  }

  const log = await getReqLogger({ action: "createCoffeeType" });
  const supabase = await createClient();
  const { error } = await supabase.from("coffee_types").insert(fields);
  if (error) {
    log.error("coffee_type_insert_falhou", {
      err: safeError(error),
      code: error.code,
    });
    redirect(
      `/admin/cotacoes/tipos/nova?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  const { error: auditError } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "create_coffee_type",
    entity: "coffee_types",
    payload: { slug: fields.slug, species: fields.species },
  });
  if (auditError) {
    log.warn("audit_insert_falhou", {
      err: safeError(auditError),
      code: auditError.code,
    });
  }

  revalidatePath("/admin/cotacoes/tipos");
  redirect("/admin/cotacoes/tipos?ok=Tipo%20criado");
}

export async function updateCoffeeType(formData: FormData) {
  const user = await requireAppAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/cotacoes/tipos?error=ID%20inv%C3%A1lido");

  const { errors, fields } = readFields(formData);
  if (errors.length > 0) {
    redirect(
      `/admin/cotacoes/tipos/${id}?error=${encodeURIComponent(errors.join(" "))}`,
    );
  }

  const log = await getReqLogger({ action: "updateCoffeeType", coffeeTypeId: id });
  const supabase = await createClient();
  const { error } = await supabase
    .from("coffee_types")
    .update(fields)
    .eq("id", id);
  if (error) {
    log.error("coffee_type_update_falhou", {
      err: safeError(error),
      code: error.code,
    });
    redirect(
      `/admin/cotacoes/tipos/${id}?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  const { error: auditError } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "update_coffee_type",
    entity: "coffee_types",
    entity_id: id,
    payload: { slug: fields.slug },
  });
  if (auditError) {
    log.warn("audit_insert_falhou", {
      err: safeError(auditError),
      code: auditError.code,
    });
  }

  revalidatePath("/admin/cotacoes/tipos");
  redirect(`/admin/cotacoes/tipos/${id}?saved=1`);
}

export async function toggleCoffeeTypeActive(formData: FormData) {
  const user = await requireAppAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const next = formData.get("active") === "true";
  if (!id) redirect("/admin/cotacoes/tipos?error=ID%20inv%C3%A1lido");

  const log = await getReqLogger({ action: "toggleCoffeeTypeActive", coffeeTypeId: id });
  const supabase = await createClient();
  const { error } = await supabase
    .from("coffee_types")
    .update({ active: next })
    .eq("id", id);
  if (error) {
    log.error("coffee_type_update_falhou", {
      err: safeError(error),
      code: error.code,
    });
    redirect(
      `/admin/cotacoes/tipos?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  const { error: auditError } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: next ? "activate_coffee_type" : "deactivate_coffee_type",
    entity: "coffee_types",
    entity_id: id,
  });
  if (auditError) {
    log.warn("audit_insert_falhou", {
      err: safeError(auditError),
      code: auditError.code,
    });
  }

  revalidatePath("/admin/cotacoes/tipos");
  redirect(
    `/admin/cotacoes/tipos?ok=${next ? "Tipo%20ativado" : "Tipo%20desativado"}`,
  );
}
