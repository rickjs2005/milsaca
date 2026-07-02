"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { requireUser } from "@/lib/auth";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import { limparNumeroBR } from "@/lib/numero-br";

/**
 * Lê um valor monetário no formato pt-BR ("1.450,00") vindo de um input
 * `type="text" inputMode="decimal"`. Diferente das demais actions, retorna
 * `number` cru (pode ser NaN/0) — a validação é feita no call-site.
 */
function parsePrecoBR(v: FormDataEntryValue | null): number {
  return Number(limparNumeroBR(String(v ?? "")));
}

// Teto de sanidade de preço (P10): R$/saca acima disso é quase certo erro de
// digitação. Espelha PRECO_SACA_MAX da action de propostas da corretora.
const PRECO_SACA_MAX = 100_000;

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

  if (preco > PRECO_SACA_MAX) {
    redirect(
      `${back}?error=${encodeURIComponent("Valor por saca fora do intervalo plausível.")}`,
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

/**
 * Produtor ACEITA ou REJEITA uma proposta enviada (P2 — fecha o ciclo de
 * negociação dentro do app, antes só existia no mobile). Reusa o RPC
 * `v1_responder_proposta` (SECURITY DEFINER): compare-and-set em
 * status='enviada', checa posse (auth.uid() = leads.produtor_id), guarda de
 * validade, e os efeitos colaterais (avança o lead + notifica a corretora)
 * são resolvidos no banco — mesmo comportamento do app mobile.
 */
export async function responderProposta(formData: FormData) {
  await requireUser("/painel/produtor/negociacoes");

  const propostaId = String(formData.get("proposta_id") ?? "").trim();
  const leadId = String(formData.get("lead_id") ?? "").trim();
  const resposta = String(formData.get("resposta") ?? "").trim();
  const back = leadId
    ? `/painel/produtor/negociacoes/${leadId}`
    : "/painel/produtor/negociacoes";

  if (!propostaId || (resposta !== "aceita" && resposta !== "rejeitada")) {
    redirect(
      `${back}?error=${encodeURIComponent("Resposta inválida.")}`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("v1_responder_proposta", {
    p_proposta_id: propostaId,
    p_resposta: resposta,
  });
  const row = Array.isArray(data) ? data[0] : data;

  if (error || !row?.success) {
    const log = await getReqLogger({
      action: "responderProposta",
      leadId,
    });
    log.error("responder_proposta_falhou", {
      resposta,
      ...(row?.error_msg ? { motivo: row.error_msg } : {}),
      ...(error ? { err: safeError(error) } : {}),
    });
    redirect(
      `${back}?error=${encodeURIComponent("Não foi possível registrar sua resposta. A proposta pode ter sido alterada ou vencido — atualize a página.")}`,
    );
  }

  revalidatePath(back);
  redirect(
    `${back}?saved=${encodeURIComponent(
      resposta === "aceita"
        ? "Proposta aceita! A corretora foi avisada."
        : "Proposta recusada. A corretora foi avisada.",
    )}`,
  );
}
