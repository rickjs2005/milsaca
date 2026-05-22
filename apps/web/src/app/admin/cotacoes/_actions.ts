"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { friendlyPostgresError } from "@/lib/postgres-error";
import type { CoffeeProcesso, CoffeeSpecie } from "@milsaca/types";

const SPECIES: readonly CoffeeSpecie[] = ["arabica", "conillon"];
const PROCESSOS: readonly CoffeeProcesso[] = [
  "natural",
  "cereja_descascado",
  "cd_desmucilado",
  "despolpado",
  "fermentacao_induzida",
];

const COFFEE_TYPE_LABEL: Record<CoffeeSpecie, string> = {
  arabica: "Arábica",
  conillon: "Conillón",
};

function parsePriceBRL(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function revalidateAffected() {
  revalidatePath("/admin/cotacoes");
  revalidatePath("/painel/produtor/cotacoes");
  revalidatePath("/painel/produtor");
  revalidatePath("/painel/corretora/cotacoes");
  revalidatePath("/painel/corretora");
}

/**
 * Cria cotação manual em nome de uma corretora — admin opera por
 * conta dela. RLS `cotacoes_tenant_insert` permite quando is_admin().
 *
 * Audit_log registra o admin como actor + corretora destino.
 */
export async function createCotacaoAdmin(formData: FormData) {
  const user = await requireAppAdmin();

  const corretora_id = String(formData.get("corretora_id") ?? "").trim();
  const specieRaw = String(formData.get("specie") ?? "").trim();
  const processRaw = String(formData.get("process") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim() || null;
  const source = String(formData.get("source") ?? "").trim() || null;
  const reference_date = String(formData.get("reference_date") ?? "").trim();
  const price = parsePriceBRL(formData.get("price"));

  const errors: string[] = [];
  if (!corretora_id) errors.push("Selecione a corretora");
  if (!SPECIES.includes(specieRaw as CoffeeSpecie)) errors.push("Espécie inválida");
  if (!reference_date) errors.push("Data obrigatória");
  if (price == null) errors.push("Preço inválido");

  if (errors.length > 0) {
    const params = new URLSearchParams({ error: errors.join(", ") });
    redirect(`/admin/cotacoes/nova?${params.toString()}`);
  }

  const specie = specieRaw as CoffeeSpecie;
  const process = PROCESSOS.includes(processRaw as CoffeeProcesso)
    ? (processRaw as CoffeeProcesso)
    : null;

  const supabase = await createClient();
  const { error } = await supabase.from("cotacoes").insert({
    corretora_id,
    coffee_type: COFFEE_TYPE_LABEL[specie],
    specie,
    process,
    region,
    source,
    reference_date,
    price: price as number,
  });

  if (error) {
    const params = new URLSearchParams({
      error: friendlyPostgresError(error),
    });
    redirect(`/admin/cotacoes/nova?${params.toString()}`);
  }

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "create_cotacao",
    entity: "cotacoes",
    corretora_id,
    payload: { specie, process, region, source, reference_date, price },
  });

  revalidateAffected();
  redirect(`/admin/cotacoes?ok=${encodeURIComponent("Cotação cadastrada")}`);
}

export async function deleteCotacaoAdmin(formData: FormData) {
  const user = await requireAppAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/cotacoes?error=ID%20inv%C3%A1lido");

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("cotacoes")
    .select("corretora_id, specie, region, price")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("cotacoes").delete().eq("id", id);
  if (error) {
    redirect(
      `/admin/cotacoes?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "delete_cotacao",
    entity: "cotacoes",
    entity_id: id,
    corretora_id: row?.corretora_id ?? null,
    payload: row ?? {},
  });

  revalidateAffected();
  redirect(`/admin/cotacoes?ok=${encodeURIComponent("Cotação removida")}`);
}
