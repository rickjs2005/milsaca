"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import type { Json } from "@milsaca/types/database";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { sacasParaKg } from "@/lib/unidades";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import { ensureCorretora, requireActiveSubscription } from "../_lib/corretora";
import {
  createLoteSchema,
  flattenZodErrors,
  formDataToObject,
} from "../_lib/schemas";
import { LOTE_STATUS_ORDER, type LoteStatus } from "./_lib/lote-meta";
import { listProdutores } from "./_lib/queries";

function isLoteStatus(v: string): v is LoteStatus {
  return (LOTE_STATUS_ORDER as readonly string[]).includes(v);
}

export async function createLote(formData: FormData) {
  const profile = await ensureCorretora();
  await requireActiveSubscription(
    profile.corretora_id,
    "/painel/corretora/lotes",
  );

  const parsed = createLoteSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    const params = new URLSearchParams({
      error: flattenZodErrors(parsed.error),
    });
    redirect(`/painel/corretora/lotes/novo?${params.toString()}`);
  }
  const fields = parsed.data;

  // Defesa em profundidade: o produtor precisa pertencer ao universo da
  // corretora (mesmas leads/contratos/favoritos do picker). Bloqueia POST
  // direto com UUID arbitrário de outro tenant.
  const produtoresPermitidos = await listProdutores(profile.corretora_id);
  if (!produtoresPermitidos.some((p) => p.id === fields.produtor_id)) {
    const log = await getReqLogger({
      action: "createLote",
      corretoraId: profile.corretora_id,
    });
    log.error("lote_produtor_invalido", {
      produtorId: fields.produtor_id,
    });
    const params = new URLSearchParams({
      error: "Produtor inválido para esta corretora.",
    });
    redirect(`/painel/corretora/lotes/novo?${params.toString()}`);
  }

  // peso_sacas virou coluna GERADA (peso_kg/60). A corretora ainda digita em
  // sacas no form, então convertemos pra kg (a verdade) e NUNCA gravamos
  // peso_sacas direto. Ver @/lib/unidades e migration 20261060.
  const { peso_sacas, ...loteFields } = fields;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lotes")
    .insert({
      corretora_id: profile.corretora_id,
      ...loteFields,
      peso_kg: peso_sacas != null ? sacasParaKg(peso_sacas) : null,
      status: "aguardando_classificacao",
    })
    .select("id")
    .single();

  if (error) {
    const log = await getReqLogger({
      action: "createLote",
      corretoraId: profile.corretora_id,
    });
    log.error("lote_insert_falhou", {
      code: error.code,
      err: safeError(error),
    });
    const params = new URLSearchParams({
      error: friendlyPostgresError(error),
    });
    redirect(`/painel/corretora/lotes/novo?${params.toString()}`);
  }

  revalidatePath("/painel/corretora/lotes");
  redirect(`/painel/corretora/lotes/${data.id}`);
}

/**
 * Move o status do lote. Defesa em profundidade: filtra por corretora_id
 * além da RLS (impede id de outra corretora bater por engano).
 */
export async function updateLoteStatus(formData: FormData) {
  const profile = await ensureCorretora();
  await requireActiveSubscription(
    profile.corretora_id,
    "/painel/corretora/lotes",
  );

  const id = String(formData.get("id") ?? "").trim();
  const next = String(formData.get("status") ?? "").trim();
  if (!id || !isLoteStatus(next)) redirect("/painel/corretora/lotes");

  const supabase = await createClient();

  // Lote VENDIDO é terminal: o café já foi negociado/entregue. Não volta pra
  // rascunho/classificado etc. (o re-fluxo de classificação entre os outros
  // estados segue livre). Compare-and-set evita corrida.
  const { data: atual } = await supabase
    .from("lotes")
    .select("status")
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id)
    .maybeSingle<{ status: LoteStatus }>();
  if (!atual) redirect("/painel/corretora/lotes");
  if (atual.status === "vendido") {
    const params = new URLSearchParams({
      error: "Lote vendido não muda de status — o café já foi negociado.",
    });
    redirect(`/painel/corretora/lotes?${params.toString()}`);
  }

  const { data: updated, error } = await supabase
    .from("lotes")
    .update({ status: next as LoteStatus })
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id)
    .eq("status", atual.status)
    .select("id");

  if (error) {
    const log = await getReqLogger({
      action: "updateLoteStatus",
      corretoraId: profile.corretora_id,
      loteId: id,
    });
    log.error("lote_status_update_falhou", {
      to: next,
      code: error.code,
      err: safeError(error),
    });
    const params = new URLSearchParams({
      error: friendlyPostgresError(error),
    });
    redirect(`/painel/corretora/lotes?${params.toString()}`);
  }
  if (!updated || updated.length === 0) {
    redirect(
      `/painel/corretora/lotes?error=${encodeURIComponent("O lote já foi atualizado por outra ação. Recarregue.")}`,
    );
  }

  revalidatePath("/painel/corretora/lotes");
  revalidatePath(`/painel/corretora/lotes/${id}`);
  revalidatePath("/painel/corretora");
  redirect("/painel/corretora/lotes?ok=Status%20atualizado");
}

// -----------------------------------------------------------------
// EUDR (F2): vínculo lote ↔ talhões georreferenciados
// -----------------------------------------------------------------

/**
 * Vincula um talhão do produtor ao lote (origem EUDR). A RLS de
 * lote_talhoes valida no with check que o talhão pertence ao produtor
 * do lote — aqui só traduzimos o erro pra mensagem amigável.
 */
export async function vincularTalhao(formData: FormData) {
  const profile = await ensureCorretora();
  const loteId = String(formData.get("lote_id") ?? "").trim();
  const talhaoId = String(formData.get("talhao_id") ?? "").trim();
  const back = `/painel/corretora/lotes/${loteId}`;

  if (!loteId || !talhaoId) {
    redirect(`${back}?error=${encodeURIComponent("Selecione um talhão.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("lote_talhoes")
    .insert({ lote_id: loteId, talhao_id: talhaoId });

  if (error) {
    if (error.code === "23505") {
      redirect(
        `${back}?error=${encodeURIComponent("Este talhão já está vinculado ao lote.")}`,
      );
    }
    if (error.code === "42501") {
      redirect(
        `${back}?error=${encodeURIComponent("Talhão não pertence ao produtor deste lote.")}`,
      );
    }
    const log = await getReqLogger({
      action: "vincularTalhao",
      corretoraId: profile.corretora_id,
      loteId,
    });
    log.error("lote_talhao_vincular_falhou", {
      code: error.code,
      err: safeError(error),
    });
    redirect(`${back}?error=${encodeURIComponent(friendlyPostgresError(error))}`);
  }

  revalidatePath(back);
  redirect(`${back}?saved=${encodeURIComponent("Talhão vinculado ao lote.")}`);
}

/** Remove o vínculo lote↔talhão (não apaga o talhão do produtor). */
export async function desvincularTalhao(formData: FormData) {
  const profile = await ensureCorretora();
  const loteId = String(formData.get("lote_id") ?? "").trim();
  const talhaoId = String(formData.get("talhao_id") ?? "").trim();
  const back = `/painel/corretora/lotes/${loteId}`;

  if (!loteId || !talhaoId) redirect(back);

  const supabase = await createClient();
  const { error } = await supabase
    .from("lote_talhoes")
    .delete()
    .eq("lote_id", loteId)
    .eq("talhao_id", talhaoId);

  if (error) {
    const log = await getReqLogger({
      action: "desvincularTalhao",
      corretoraId: profile.corretora_id,
      loteId,
    });
    log.error("lote_talhao_desvincular_falhou", {
      code: error.code,
      err: safeError(error),
    });
    redirect(`${back}?error=${encodeURIComponent(friendlyPostgresError(error))}`);
  }

  revalidatePath(back);
  redirect(`${back}?saved=${encodeURIComponent("Vínculo removido.")}`);
}

/**
 * Verifica desmatamento (MapBiomas Alerta) em todos os talhões
 * georreferenciados do lote. Duas etapas por talhão: bounding box na API
 * (filtro grosso) → interseção exata no PostGIS com o WKT de cada alerta
 * (RPC talhao_intersecta_wkt). Grava uma linha de histórico por talhão em
 * talhao_verificacoes. Corte EUDR: 31/12/2020.
 */
export async function verificarDesmatamentoLote(formData: FormData) {
  const profile = await ensureCorretora();
  const loteId = String(formData.get("lote_id") ?? "").trim();
  const back = `/painel/corretora/lotes/${loteId}`;
  if (!loteId) redirect("/painel/corretora/lotes");

  const {
    bboxDeGeojson,
    mapbiomasAlertsByBbox,
    mapbiomasConfigurado,
    mapbiomasSignIn,
  } = await import("@/lib/mapbiomas");

  if (!mapbiomasConfigurado()) {
    redirect(
      `${back}?error=${encodeURIComponent(
        "Integração MapBiomas não configurada — defina MAPBIOMAS_ALERTA_EMAIL e MAPBIOMAS_ALERTA_PASSWORD no ambiente.",
      )}`,
    );
  }

  const supabase = await createClient();
  const { data: vinculos } = await supabase
    .from("lote_talhoes")
    .select("talhoes(id, nome, geojson)")
    .eq("lote_id", loteId);
  const talhoes = (vinculos ?? [])
    .map(
      (v) =>
        v.talhoes as unknown as {
          id: string;
          nome: string;
          geojson: unknown | null;
        } | null,
    )
    .filter((t): t is { id: string; nome: string; geojson: unknown } =>
      Boolean(t && t.geojson),
    );

  if (talhoes.length === 0) {
    redirect(
      `${back}?error=${encodeURIComponent(
        "Nenhum talhão georreferenciado vinculado ao lote.",
      )}`,
    );
  }

  const log = await getReqLogger({
    action: "verificarDesmatamentoLote",
    corretoraId: profile.corretora_id,
    loteId,
  });

  let token: string;
  try {
    token = await mapbiomasSignIn();
  } catch (e) {
    log.error("mapbiomas_signin_falhou", { err: safeError(e) });
    redirect(
      `${back}?error=${encodeURIComponent(
        "Não foi possível autenticar no MapBiomas — confira as credenciais.",
      )}`,
    );
  }

  let comAlerta = 0;
  let comErro = 0;

  for (const talhao of talhoes) {
    try {
      const bbox = bboxDeGeojson(talhao.geojson);
      if (!bbox) throw new Error("bbox_indisponivel");

      const { alertas } = await mapbiomasAlertsByBbox(token, bbox);

      // Interseção exata no PostGIS; se o WKT não parsear (null), mantém
      // o alerta por precaução com conferencia='bbox'.
      const confirmados: Json[] = [];
      for (const a of alertas) {
        let conferencia: "exata" | "bbox" = "bbox";
        let intersecta: boolean | null = null;
        if (a.geometryWkt) {
          const { data } = await supabase.rpc("talhao_intersecta_wkt", {
            p_talhao_id: talhao.id,
            p_wkt: a.geometryWkt,
          });
          intersecta = data;
          if (data === true) conferencia = "exata";
        }
        if (intersecta === false) continue; // fora do talhão — descarta
        confirmados.push({
          code: a.alertCode,
          area_ha: a.areaHa,
          detected_at: a.detectedAt,
          status_name: a.statusName,
          conferencia,
        });
      }

      const { error: insertError } = await supabase
        .from("talhao_verificacoes")
        .insert({
          talhao_id: talhao.id,
          status: confirmados.length > 0 ? "alerta_detectado" : "sem_alerta",
          alertas: confirmados,
          verificado_por: profile.id,
        });
      if (insertError) throw insertError;
      if (confirmados.length > 0) comAlerta += 1;
    } catch (e) {
      comErro += 1;
      log.error("mapbiomas_verificacao_falhou", {
        talhaoId: talhao.id,
        err: safeError(e),
      });
      // Registra o erro como histórico (best-effort — se nem isso der,
      // o log acima fica como rastro).
      await supabase.from("talhao_verificacoes").insert({
        talhao_id: talhao.id,
        status: "erro",
        erro: e instanceof Error ? e.message.slice(0, 200) : "erro",
        verificado_por: profile.id,
      });
    }
  }

  revalidatePath(back);
  const ok = talhoes.length - comErro;
  if (comAlerta > 0) {
    redirect(
      `${back}?error=${encodeURIComponent(
        `Atenção: ${comAlerta} de ${ok} talhão(ões) com alerta de desmatamento após 31/12/2020. Confira os detalhes na seção EUDR.`,
      )}`,
    );
  }
  redirect(
    `${back}?saved=${encodeURIComponent(
      comErro > 0
        ? `${ok} talhão(ões) verificados sem alerta; ${comErro} com erro de consulta.`
        : `${ok} talhão(ões) verificados — nenhum alerta de desmatamento desde 31/12/2020. ✅`,
    )}`,
  );
}
