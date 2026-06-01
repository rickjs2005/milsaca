"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { getReqLogger } from "@/lib/req-logger";
import { safeError } from "@/lib/logger";
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

const UNITS = ["saca_60kg", "kg", "arroba", "libra", "tonelada"] as const;
const CURRENCIES = ["BRL", "USD"] as const;
const STATUS = ["active", "stale", "error", "hidden"] as const;

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

type CotacaoFields = {
  corretora_id: string;
  product_id: string | null;
  region_id: string | null;
  source_id: string | null;
  coffee_type: string;
  specie: CoffeeSpecie | null;
  process: CoffeeProcesso | null;
  region: string | null;
  source: string | null;
  reference_date: string;
  price: number;
  currency: string;
  unit: string;
  valid_until: string | null;
  status: string;
};

/**
 * Lê fields do form + resolve catálogos (coffee_types, pracas,
 * quote_sources). Mantém retro-compat denormalizando species/process/
 * region/source nas colunas antigas — assim a tela do produtor velha
 * continua funcionando enquanto a nova UI usa product_id/region_id.
 */
async function readFieldsWithCatalogs(
  formData: FormData,
): Promise<{ errors: string[]; fields: CotacaoFields | null }> {
  const corretora_id = String(formData.get("corretora_id") ?? "").trim();
  const product_id = String(formData.get("product_id") ?? "").trim() || null;
  const region_id = String(formData.get("region_id") ?? "").trim() || null;
  const source_id = String(formData.get("source_id") ?? "").trim() || null;
  const reference_date = String(formData.get("reference_date") ?? "").trim();
  const price = parsePriceBRL(formData.get("price"));
  const valid_until =
    String(formData.get("valid_until") ?? "").trim() || null;
  const unit = String(formData.get("unit") ?? "saca_60kg").trim();
  const currency = String(formData.get("currency") ?? "BRL").trim();
  const statusRaw = String(formData.get("status") ?? "active").trim();

  const errors: string[] = [];
  if (!corretora_id) errors.push("Selecione a corretora.");
  if (!reference_date) errors.push("Data obrigatória.");
  if (price == null) errors.push("Preço inválido.");
  if (!(UNITS as readonly string[]).includes(unit)) errors.push("Unidade inválida.");
  if (!(CURRENCIES as readonly string[]).includes(currency))
    errors.push("Moeda inválida.");
  if (!(STATUS as readonly string[]).includes(statusRaw))
    errors.push("Status inválido.");
  if (errors.length > 0 || price == null) return { errors, fields: null };

  const supabase = await createClient();

  // Resolve product_id → species/process/coffee_type
  let coffee_type = "Café";
  let specie: CoffeeSpecie | null = null;
  let process: CoffeeProcesso | null = null;

  if (product_id) {
    const { data: pt } = await supabase
      .from("coffee_types")
      .select("name, species, process")
      .eq("id", product_id)
      .maybeSingle();
    if (pt) {
      coffee_type = pt.name;
      const ptSpecies = pt.species as string;
      if (ptSpecies === "arabica") specie = "arabica";
      else if (ptSpecies === "conilon") specie = "conillon";
      const ptProcess = pt.process as string | null;
      if (ptProcess && (PROCESSOS as readonly string[]).includes(ptProcess)) {
        process = ptProcess as CoffeeProcesso;
      }
    }
  } else {
    // Fallback: campos antigos manuais
    const specieRaw = String(formData.get("specie") ?? "").trim();
    const processRaw = String(formData.get("process") ?? "").trim();
    if ((SPECIES as readonly string[]).includes(specieRaw)) {
      specie = specieRaw as CoffeeSpecie;
      coffee_type = COFFEE_TYPE_LABEL[specie];
    }
    if ((PROCESSOS as readonly string[]).includes(processRaw)) {
      process = processRaw as CoffeeProcesso;
    }
  }

  // Resolve region_id → region label
  let region: string | null = null;
  if (region_id) {
    const { data: pr } = await supabase
      .from("pracas")
      .select("name, state")
      .eq("id", region_id)
      .maybeSingle();
    if (pr) region = `${pr.name}/${pr.state}`;
  } else {
    region = String(formData.get("region") ?? "").trim() || null;
  }

  // Resolve source_id → source slug
  let source: string | null = null;
  if (source_id) {
    const { data: qs } = await supabase
      .from("quote_sources")
      .select("slug")
      .eq("id", source_id)
      .maybeSingle();
    source = qs?.slug ?? null;
  } else {
    source = String(formData.get("source") ?? "").trim() || null;
  }

  return {
    errors: [],
    fields: {
      corretora_id,
      product_id,
      region_id,
      source_id,
      coffee_type,
      specie,
      process,
      region,
      source,
      reference_date,
      price,
      currency,
      unit,
      valid_until,
      status: statusRaw,
    },
  };
}

export async function createCotacaoAdmin(formData: FormData) {
  const user = await requireAppAdmin();
  const { errors, fields } = await readFieldsWithCatalogs(formData);
  if (errors.length > 0 || !fields) {
    const params = new URLSearchParams({ error: errors.join(" ") });
    redirect(`/admin/cotacoes/nova?${params.toString()}`);
  }

  const log = await getReqLogger({
    action: "createCotacaoAdmin",
    corretoraId: fields.corretora_id,
  });
  const supabase = await createClient();
  const { error } = await supabase.from("cotacoes").insert({
    corretora_id: fields.corretora_id,
    product_id: fields.product_id,
    region_id: fields.region_id,
    source_id: fields.source_id,
    coffee_type: fields.coffee_type,
    specie: fields.specie,
    process: fields.process,
    region: fields.region,
    source: fields.source,
    reference_date: fields.reference_date,
    price: fields.price,
    currency: fields.currency,
    unit: fields.unit,
    valid_until: fields.valid_until,
    status: fields.status,
    is_manual: true,
  });

  if (error) {
    log.error("cotacao_insert_falhou", {
      err: safeError(error),
      code: error.code,
    });
    const params = new URLSearchParams({
      error: friendlyPostgresError(error),
    });
    redirect(`/admin/cotacoes/nova?${params.toString()}`);
  }

  const { error: auditError } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "create_cotacao",
    entity: "cotacoes",
    corretora_id: fields.corretora_id,
    payload: {
      product_id: fields.product_id,
      region_id: fields.region_id,
      source_id: fields.source_id,
      price: fields.price,
      reference_date: fields.reference_date,
    },
  });
  if (auditError) {
    log.warn("audit_insert_falhou", {
      err: safeError(auditError),
      code: auditError.code,
    });
  }

  revalidateAffected();
  redirect(`/admin/cotacoes?ok=${encodeURIComponent("Cotação cadastrada")}`);
}

export async function updateCotacaoAdmin(formData: FormData) {
  const user = await requireAppAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/cotacoes?error=ID%20inv%C3%A1lido");

  const { errors, fields } = await readFieldsWithCatalogs(formData);
  if (errors.length > 0 || !fields) {
    const params = new URLSearchParams({ error: errors.join(" ") });
    redirect(`/admin/cotacoes/${id}?${params.toString()}`);
  }

  const log = await getReqLogger({
    action: "updateCotacaoAdmin",
    cotacaoId: id,
    corretoraId: fields.corretora_id,
  });
  const supabase = await createClient();
  const { error } = await supabase
    .from("cotacoes")
    .update({
      corretora_id: fields.corretora_id,
      product_id: fields.product_id,
      region_id: fields.region_id,
      source_id: fields.source_id,
      coffee_type: fields.coffee_type,
      specie: fields.specie,
      process: fields.process,
      region: fields.region,
      source: fields.source,
      reference_date: fields.reference_date,
      price: fields.price,
      currency: fields.currency,
      unit: fields.unit,
      valid_until: fields.valid_until,
      status: fields.status,
    })
    .eq("id", id);

  if (error) {
    log.error("cotacao_update_falhou", {
      err: safeError(error),
      code: error.code,
    });
    redirect(
      `/admin/cotacoes/${id}?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  const { error: auditError } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "update_cotacao",
    entity: "cotacoes",
    entity_id: id,
    corretora_id: fields.corretora_id,
    payload: { price: fields.price, reference_date: fields.reference_date },
  });
  if (auditError) {
    log.warn("audit_insert_falhou", {
      err: safeError(auditError),
      code: auditError.code,
    });
  }

  revalidateAffected();
  redirect(`/admin/cotacoes/${id}?saved=1`);
}

export async function deleteCotacaoAdmin(formData: FormData) {
  const user = await requireAppAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/cotacoes?error=ID%20inv%C3%A1lido");

  const log = await getReqLogger({ action: "deleteCotacaoAdmin", cotacaoId: id });
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("cotacoes")
    .select("corretora_id, specie, region, price")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("cotacoes").delete().eq("id", id);
  if (error) {
    log.error("cotacao_delete_falhou", {
      err: safeError(error),
      code: error.code,
    });
    redirect(
      `/admin/cotacoes?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  const { error: auditError } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "delete_cotacao",
    entity: "cotacoes",
    entity_id: id,
    corretora_id: row?.corretora_id ?? null,
    payload: row ?? {},
  });
  if (auditError) {
    log.warn("audit_insert_falhou", {
      err: safeError(auditError),
      code: auditError.code,
    });
  }

  revalidateAffected();
  redirect(`/admin/cotacoes?ok=${encodeURIComponent("Cotação removida")}`);
}
