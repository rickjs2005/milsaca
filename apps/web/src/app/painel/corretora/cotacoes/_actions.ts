"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { uuidSchema } from "../_lib/schemas";
import { requireActiveSubscription } from "../_lib/corretora";
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
  // aceita "1.234,56" (BR), "1234.56" (US), "1234,56" simples
  const s = String(v).trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function revalidateAffected() {
  revalidatePath("/painel/corretora/cotacoes");
  revalidatePath("/painel/corretora");
  revalidatePath("/painel/produtor/cotacoes");
  revalidatePath("/painel/produtor");
}

export async function createCotacao(formData: FormData) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  await requireActiveSubscription(
    profile.corretora_id,
    "/painel/corretora/cotacoes",
  );

  const specieRaw = String(formData.get("specie") ?? "").trim();
  const processRaw = String(formData.get("process") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim() || null;
  const source = String(formData.get("source") ?? "").trim() || null;
  const reference_date = String(formData.get("reference_date") ?? "").trim();
  const price = parsePriceBRL(formData.get("price"));

  const errors: string[] = [];
  if (!SPECIES.includes(specieRaw as CoffeeSpecie)) errors.push("Espécie inválida");
  if (!reference_date) errors.push("Data de referência obrigatória");
  if (price == null) errors.push("Preço inválido");

  if (errors.length > 0) {
    const params = new URLSearchParams({ error: errors.join(", ") });
    redirect(`/painel/corretora/cotacoes/novo?${params.toString()}`);
  }

  const specie = specieRaw as CoffeeSpecie;
  const process = PROCESSOS.includes(processRaw as CoffeeProcesso)
    ? (processRaw as CoffeeProcesso)
    : null;

  const supabase = await createClient();
  const { error } = await supabase.from("cotacoes").insert({
    corretora_id: profile.corretora_id,
    coffee_type: COFFEE_TYPE_LABEL[specie],
    specie,
    process,
    region,
    source,
    reference_date,
    price: price as number,
  });

  if (error) {
    const params = new URLSearchParams({ error: friendlyPostgresError(error) });
    redirect(`/painel/corretora/cotacoes/novo?${params.toString()}`);
  }

  revalidateAffected();
  redirect("/painel/corretora/cotacoes");
}

export async function deleteCotacao(formData: FormData) {
  const profile = await getProfile();
  if (!profile?.corretora_id) redirect("/painel/escolher?error=Sem%20corretora%20vinculada");

  const idParsed = uuidSchema.safeParse(String(formData.get("id") ?? "").trim());
  if (!idParsed.success) redirect("/painel/corretora/cotacoes");
  const id = idParsed.data;

  // Filtra por corretora_id explicitamente — defesa em profundidade:
  // a RLS já bloqueia, mas o SDK não precisa nem chegar lá.
  const supabase = await createClient();
  await supabase
    .from("cotacoes")
    .delete()
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id);

  revalidateAffected();
  redirect("/painel/corretora/cotacoes");
}
