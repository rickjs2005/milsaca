"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getProfile, getUser } from "@/lib/auth";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import { getCorretoraSubscriptionInfo } from "../../../_lib/corretora";
import { calcularLaudo, calcularPVA } from "@milsaca/cob";
import type { DefeitosCrus, OpcoesCalculo } from "@milsaca/cob";
import type { Json } from "@milsaca/types/database";

type ClassificarInput = {
  loteId: string;
  defeitosCrus: DefeitosCrus;
  brocadosPorDefeito: 2 | 3 | 4 | 5;
  bebida: string | null;
  classe: string | null;
  aspecto: "bom" | "regular" | "mau" | null;
  torra: string | null;
  peneiras: Array<{ peneira: string; percentual: number }>;
  peneiraDominante: string | null;
  bicaCorrida: boolean;
  umidade: number | null;
  pva100g: { pretos: number; verdes: number; ardidos: number } | null;
  impurezasPct: number | null;
  observacoes: string | null;
};

export async function saveClassificacao(input: ClassificarInput) {
  const profile = await getProfile();
  const user = await getUser();
  if (!profile?.corretora_id || !user) {
    return { ok: false as const, error: "Sessão inválida" };
  }

  // Gate de subscription. Como esta action é chamada do client e retorna
  // {ok,error} em vez de redirecionar, fazemos check manual.
  const sub = await getCorretoraSubscriptionInfo(profile.corretora_id);
  if (!sub.isUsable) {
    return {
      ok: false as const,
      error:
        sub.effectiveStatus === "canceled"
          ? "Assinatura cancelada. Fale com o suporte."
          : sub.effectiveStatus === "expired"
            ? "Trial expirado. Fale com o suporte."
            : sub.effectiveStatus === "past_due"
              ? "Pagamento em atraso. Fale com o suporte."
              : "Sem assinatura ativa. Fale com o suporte.",
    };
  }

  const supabase = await createClient();

  // Defesa em profundidade: a RLS de INSERT só checa `corretora_id = meu`,
  // não que o lote é meu. Validamos a posse do lote antes de classificar
  // pra não criar classificação órfã apontando pra lote de outro tenant.
  const { data: loteOwn } = await supabase
    .from("lotes")
    .select("id")
    .eq("id", input.loteId)
    .eq("corretora_id", profile.corretora_id)
    .maybeSingle<{ id: string }>();
  if (!loteOwn) {
    const log = await getReqLogger({
      action: "saveClassificacao",
      corretoraId: profile.corretora_id,
      loteId: input.loteId,
    });
    log.error("classificacao_lote_invalido", { loteId: input.loteId });
    return { ok: false as const, error: "Lote inválido para esta corretora." };
  }

  const opts: OpcoesCalculo = {
    brocadosPorDefeito: input.brocadosPorDefeito,
  };
  const resultado = calcularLaudo(input.defeitosCrus, opts);

  const pva =
    input.pva100g != null
      ? calcularPVA({
          pretos: input.pva100g.pretos,
          verdes: input.pva100g.verdes,
          ardidos: input.pva100g.ardidos,
        })
      : null;

  const { error } = await supabase.from("classificacoes_cob").insert({
    lote_id: input.loteId,
    corretora_id: profile.corretora_id,
    classificador_id: user.id,
    total_defeitos: resultado.total_defeitos,
    tipo: resultado.tipo,
    pontuacao: resultado.pontuacao,
    fora_de_tipo: resultado.fora_de_tipo,
    fora_de_tipo_motivos: resultado.fora_de_tipo_motivos,
    schema_version: resultado.schema_version,
    defeitos_crus: input.defeitosCrus as unknown as Json,
    brocados_por_defeito: input.brocadosPorDefeito,
    bebida: input.bebida,
    classe: input.classe,
    aspecto: input.aspecto,
    torra: input.torra,
    peneiras: input.peneiras as unknown as Json,
    peneira_dominante: input.peneiraDominante,
    bica_corrida: input.bicaCorrida,
    umidade: input.umidade,
    pva,
    impurezas_pct: input.impurezasPct,
    observacoes: input.observacoes,
  });

  if (error) {
    const log = await getReqLogger({
      action: "saveClassificacao",
      corretoraId: profile.corretora_id,
      loteId: input.loteId,
    });
    log.error("classificacao_insert_falhou", {
      code: error.code,
      err: safeError(error),
    });
    return { ok: false as const, error: error.message };
  }

  // Atualizar status do lote conforme resultado
  const { error: loteErr } = await supabase
    .from("lotes")
    .update({
      status: resultado.fora_de_tipo ? "fora_de_tipo" : "classificado",
    })
    .eq("id", input.loteId);
  if (loteErr) {
    const log = await getReqLogger({
      action: "saveClassificacao",
      corretoraId: profile.corretora_id,
      loteId: input.loteId,
    });
    log.error("lote_status_update_falhou", {
      code: loteErr.code,
      err: safeError(loteErr),
    });
  }

  revalidatePath(`/painel/corretora/lotes/${input.loteId}`);
  revalidatePath("/painel/corretora/lotes");
  redirect(`/painel/corretora/lotes/${input.loteId}`);
}
