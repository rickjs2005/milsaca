"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { requireUser } from "@/lib/auth";
import { getProdutorByProfileId } from "../_lib/produtor";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import { parseNumeroBR } from "@/lib/numero-br";

const PLANO = "/painel/produtor/plano";
const erro = (m: string): never =>
  redirect(`${PLANO}?error=${encodeURIComponent(m)}`);

// "1.234,56" / "1234.56" → número > 0, ou null.
function num(v: FormDataEntryValue | null): number | null {
  return parseNumeroBR(v, { exigirPositivo: true });
}

export async function criarMeta(formData: FormData) {
  const user = await requireUser(PLANO);
  const sacas = num(formData.get("sacas"));
  const precoAlvo = num(formData.get("preco_alvo"));
  const criarAlerta = formData.get("criar_alerta") === "on";
  if (!sacas) erro("Informe quantas sacas você quer vender.");
  if (!precoAlvo) erro("Informe o preço alvo (R$/saca).");

  const supabase = await createClient();

  // Reaproveita a infra de alvos: cria um price_alert (acima_de) pra avisar
  // quando o mercado bater o preço. Resolve o coffee_type da espécie do produtor.
  let alertaId: string | null = null;
  if (criarAlerta) {
    const produtor = await getProdutorByProfileId(user.id);
    const species = produtor?.specie === "conilon" ? "conilon" : "arabica";
    const { data: ct } = await supabase
      .from("coffee_types")
      .select("id")
      .eq("species", species)
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (ct?.id) {
      const { data: alerta } = await supabase
        .from("price_alerts")
        .insert({
          produtor_id: user.id,
          product_id: ct.id,
          condition: "acima_de",
          target_price: precoAlvo,
          channel: "whatsapp",
          active: true,
          notes: `Meta de venda: ${sacas} sacas`,
        })
        .select("id")
        .maybeSingle();
      alertaId = alerta?.id ?? null;
    }
  }

  const { error } = await supabase.from("metas_venda").insert({
    produtor_id: user.id,
    sacas: sacas!,
    preco_alvo: precoAlvo!,
    alerta_id: alertaId,
  });
  if (error) {
    const log = await getReqLogger({ action: "criarMeta", userId: user.id });
    log.error("meta_insert_falhou", { code: error.code, err: safeError(error) });
    erro(friendlyPostgresError(error));
  }

  revalidatePath(PLANO);
  redirect(`${PLANO}?ok=${encodeURIComponent("Meta de venda criada.")}`);
}

export async function cancelarMeta(formData: FormData) {
  const user = await requireUser(PLANO);
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect(PLANO);

  const supabase = await createClient();
  // Desativa o alerta vinculado, se houver, antes de cancelar a meta.
  const { data: meta } = await supabase
    .from("metas_venda")
    .select("alerta_id")
    .eq("id", id)
    .eq("produtor_id", user.id)
    .maybeSingle();
  const alertaId = (meta as { alerta_id: string | null } | null)?.alerta_id ?? null;

  await supabase
    .from("metas_venda")
    .update({ status: "cancelada" })
    .eq("id", id)
    .eq("produtor_id", user.id);

  if (alertaId) {
    await supabase
      .from("price_alerts")
      .update({ active: false })
      .eq("id", alertaId)
      .eq("produtor_id", user.id);
  }

  revalidatePath(PLANO);
  redirect(`${PLANO}?ok=${encodeURIComponent("Meta cancelada.")}`);
}
