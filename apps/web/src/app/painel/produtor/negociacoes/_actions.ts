"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { requireUser } from "@/lib/auth";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";

/**
 * Lê um valor monetário no formato pt-BR ("1.450,00") vindo de um input
 * `type="text" inputMode="decimal"`: tira espaços, remove os pontos de
 * milhar e troca a vírgula decimal por ponto. Espelha o `parseNumber` das
 * actions da corretora (não há helper compartilhado; cada action tem o seu).
 */
function parsePrecoBR(v: FormDataEntryValue | null): number {
  const s = String(v ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return Number(s);
}

/**
 * Contraproposta LEVE do produtor: manda um contra-valor (R$/saca + msg
 * opcional) que vira evento no histórico do lead e notifica a corretora
 * (in-app), via a RPC contrapropor_lead. A negociação detalhada continua
 * no WhatsApp — isto só estrutura o "número".
 */
export async function contraproporNegociacao(formData: FormData) {
  await requireUser("/painel/produtor/negociacoes");

  const leadId = String(formData.get("lead_id") ?? "").trim();
  const preco = parsePrecoBR(formData.get("preco_saca"));
  const mensagem = String(formData.get("mensagem") ?? "").trim() || null;
  const back = leadId
    ? `/painel/produtor/negociacoes/${leadId}`
    : "/painel/produtor/negociacoes";

  if (!leadId || !Number.isFinite(preco) || preco <= 0) {
    redirect(
      `${back}?error=${encodeURIComponent("Informe um valor por saca válido.")}`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("contrapropor_lead", {
    p_lead_id: leadId,
    p_preco_saca: preco,
    p_mensagem: mensagem ?? undefined,
  });
  const row = Array.isArray(data) ? data[0] : data;

  if (error || !row?.success) {
    const log = await getReqLogger({
      action: "contraproporNegociacao",
      leadId,
    });
    log.error("contrapropor_lead_falhou", {
      ...(error ? { err: safeError(error) } : {}),
    });
    redirect(
      `${back}?error=${encodeURIComponent("Não foi possível enviar a contraproposta. Tente de novo.")}`,
    );
  }

  revalidatePath(back);
  redirect(
    `${back}?saved=${encodeURIComponent("Contraproposta enviada — a corretora foi avisada.")}`,
  );
}
