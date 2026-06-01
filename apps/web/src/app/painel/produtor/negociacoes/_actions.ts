"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { requireUser } from "@/lib/auth";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";

/**
 * Contraproposta LEVE do produtor: manda um contra-valor (R$/saca + msg
 * opcional) que vira evento no histórico do lead e notifica a corretora
 * (in-app), via a RPC contrapropor_lead. A negociação detalhada continua
 * no WhatsApp — isto só estrutura o "número".
 */
export async function contraproporNegociacao(formData: FormData) {
  await requireUser("/painel/produtor/negociacoes");

  const leadId = String(formData.get("lead_id") ?? "").trim();
  const preco = Number(String(formData.get("preco_saca") ?? "").trim());
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
