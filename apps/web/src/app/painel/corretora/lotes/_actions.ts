"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import type { CoffeeProcesso, CoffeeSpecie } from "@milsaca/types";
import type { TablesInsert } from "@/lib/db-helpers";

const SPECIES: CoffeeSpecie[] = ["arabica", "conillon"];
const PROCESSOS: CoffeeProcesso[] = [
  "natural",
  "cereja_descascado",
  "cd_desmucilado",
  "despolpado",
  "fermentacao_induzida",
];

function parseNumber(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function createLote(formData: FormData) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const codigo = String(formData.get("codigo") ?? "").trim();
  const produtor_id = String(formData.get("produtor_id") ?? "").trim();
  const specie = String(formData.get("specie") ?? "").trim() as CoffeeSpecie;
  const processoRaw = String(formData.get("processo") ?? "").trim();
  const processo = (PROCESSOS as string[]).includes(processoRaw)
    ? (processoRaw as CoffeeProcesso)
    : null;
  const safra = String(formData.get("safra") ?? "").trim() || null;
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const peso_sacas = parseNumber(formData.get("peso_sacas"));
  const umidade_inicial = parseNumber(formData.get("umidade_inicial"));

  const errors: string[] = [];
  if (!codigo) errors.push("Código obrigatório");
  if (!produtor_id) errors.push("Produtor obrigatório");
  if (!SPECIES.includes(specie)) errors.push("Espécie inválida");
  if (errors.length > 0) {
    const params = new URLSearchParams({ error: errors.join(", ") });
    redirect(`/painel/corretora/lotes/novo?${params.toString()}`);
  }

  const supabase = await createClient();
  const payload: TablesInsert<"lotes"> = {
    corretora_id: profile.corretora_id,
    produtor_id,
    codigo,
    specie,
    processo,
    safra,
    descricao,
    peso_sacas,
    umidade_inicial,
    status: "aguardando_classificacao",
  };
  const { data, error } = await supabase
    .from("lotes")
    .insert(payload as never)
    .select("id")
    .single();

  if (error) {
    const params = new URLSearchParams({ error: error.message });
    redirect(`/painel/corretora/lotes/novo?${params.toString()}`);
  }

  const row = data as { id: string } | null;
  if (!row) {
    redirect("/painel/corretora/lotes/novo?error=Falha%20ao%20criar%20lote");
  }
  revalidatePath("/painel/corretora/lotes");
  redirect(`/painel/corretora/lotes/${row.id}`);
}
