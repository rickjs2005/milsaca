"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import { parseNumeroBR } from "@/lib/numero-br";

const CONDITIONS = [
  "acima_de",
  "abaixo_de",
  "melhor_preco",
  "acima_media",
] as const;
type Condition = (typeof CONDITIONS)[number];
const CHANNELS = ["app", "whatsapp", "email"] as const;

function parsePriceBRL(v: FormDataEntryValue | null): number | null {
  return parseNumeroBR(v, { exigirPositivo: true });
}

/** Percentual ("5" ou "5,5") → número > 0, ou null. */
function parsePct(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace("%", "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

type Fields = {
  product_id: string;
  region_id: string | null;
  target_price: number | null;
  target_pct: number | null;
  condition: Condition;
  channel: "app" | "whatsapp" | "email";
  active: boolean;
  notes: string | null;
};

function readFields(formData: FormData): {
  errors: string[];
  fields: Fields | null;
} {
  const product_id = String(formData.get("product_id") ?? "").trim();
  const region_id = String(formData.get("region_id") ?? "").trim() || null;
  const target_price = parsePriceBRL(formData.get("target_price"));
  const target_pct = parsePct(formData.get("target_pct"));
  const condition = String(formData.get("condition") ?? "").trim();
  const channel = String(formData.get("channel") ?? "app").trim();
  const active = formData.get("active") === "on";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const isFixo = condition === "acima_de" || condition === "abaixo_de";
  const errors: string[] = [];
  if (!product_id) errors.push("Selecione o tipo de café.");
  if (!(CONDITIONS as readonly string[]).includes(condition))
    errors.push("Condição inválida.");
  if (isFixo && target_price == null) errors.push("Preço alvo inválido.");
  if (condition === "acima_media" && target_pct == null)
    errors.push("Informe a % acima da média.");
  if (!(CHANNELS as readonly string[]).includes(channel))
    errors.push("Canal inválido.");

  if (errors.length > 0) {
    return { errors, fields: null };
  }
  return {
    errors,
    fields: {
      product_id,
      region_id,
      target_price: isFixo ? target_price : null,
      target_pct: condition === "acima_media" ? target_pct : null,
      condition: condition as Condition,
      channel: channel as "app" | "whatsapp" | "email",
      active,
      notes,
    },
  };
}

export async function createAlert(formData: FormData) {
  const user = await requireUser();
  const { errors, fields } = readFields(formData);
  if (errors.length > 0 || !fields) {
    const p = new URLSearchParams({ error: errors.join(" ") });
    redirect(`/painel/produtor/cotacoes/alvos/novo?${p.toString()}`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("price_alerts")
    .insert({ ...fields, produtor_id: user.id });

  if (error) {
    const log = await getReqLogger({ action: "createAlert" });
    log.error("price_alert_insert_falhou", { err: safeError(error), code: error.code });
    const p = new URLSearchParams({ error: friendlyPostgresError(error) });
    redirect(`/painel/produtor/cotacoes/alvos/novo?${p.toString()}`);
  }

  revalidatePath("/painel/produtor/cotacoes/alvos");
  revalidatePath("/painel/produtor/cotacoes");
  redirect("/painel/produtor/cotacoes/alvos?ok=Alvo%20criado");
}

export async function updateAlert(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/painel/produtor/cotacoes/alvos?error=ID%20inv%C3%A1lido");

  const { errors, fields } = readFields(formData);
  if (errors.length > 0 || !fields) {
    const p = new URLSearchParams({ error: errors.join(" ") });
    redirect(`/painel/produtor/cotacoes/alvos/${id}?${p.toString()}`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("price_alerts")
    .update(fields)
    .eq("id", id)
    .eq("produtor_id", user.id);

  if (error) {
    const log = await getReqLogger({ action: "updateAlert", alertId: id });
    log.error("price_alert_update_falhou", { err: safeError(error), code: error.code });
    redirect(
      `/painel/produtor/cotacoes/alvos/${id}?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  revalidatePath("/painel/produtor/cotacoes/alvos");
  redirect(`/painel/produtor/cotacoes/alvos/${id}?saved=1`);
}

export async function toggleAlertActive(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  const next = formData.get("active") === "true";
  if (!id) redirect("/painel/produtor/cotacoes/alvos?error=ID%20inv%C3%A1lido");

  const supabase = await createClient();
  const { error } = await supabase
    .from("price_alerts")
    .update({ active: next })
    .eq("id", id)
    .eq("produtor_id", user.id);

  if (error) {
    const log = await getReqLogger({ action: "toggleAlertActive", alertId: id });
    log.error("price_alert_toggle_falhou", { err: safeError(error), code: error.code });
    redirect(
      `/painel/produtor/cotacoes/alvos?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  revalidatePath("/painel/produtor/cotacoes/alvos");
  redirect(
    `/painel/produtor/cotacoes/alvos?ok=${next ? "Alvo%20ativado" : "Alvo%20desativado"}`,
  );
}

export async function deleteAlert(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/painel/produtor/cotacoes/alvos?error=ID%20inv%C3%A1lido");

  const supabase = await createClient();
  const { error } = await supabase
    .from("price_alerts")
    .delete()
    .eq("id", id)
    .eq("produtor_id", user.id);
  if (error) {
    const log = await getReqLogger({ action: "deleteAlert", alertId: id });
    log.error("price_alert_delete_falhou", { err: safeError(error), code: error.code });
  }

  revalidatePath("/painel/produtor/cotacoes/alvos");
  redirect("/painel/produtor/cotacoes/alvos?ok=Alvo%20removido");
}
