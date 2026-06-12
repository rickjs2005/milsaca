"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import { uuidSchema } from "../_lib/schemas";
import { notify } from "@/lib/notify";
import { parseNumeroBR } from "@/lib/numero-br";
import {
  ensureCorretora,
  isCorretoraDono,
  requireActiveSubscription,
} from "../_lib/corretora";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const PAGAMENTOS = "/painel/corretora/pagamentos";
const SO_DONO = encodeURIComponent(
  "Só o dono da corretora pode registrar e confirmar repasses.",
);

function parseBRL(v: FormDataEntryValue | null): number | null {
  return parseNumeroBR(v, { permitirNegativo: true });
}

function revalidateAffected() {
  revalidatePath("/painel/corretora/pagamentos");
  revalidatePath("/painel/produtor/financeiro");
  revalidatePath("/painel/produtor");
}

/**
 * Cria um registro de pagamento ao produtor a partir de um contrato.
 * É CONTROLE — não movimenta dinheiro nem guarda dado bancário. O produtor
 * passa a ver "a receber" no Financeiro dele. valor_liquido = bruto - descontos.
 */
export async function createPagamento(formData: FormData) {
  const profile = await ensureCorretora();
  if (!isCorretoraDono(profile)) {
    redirect(`${PAGAMENTOS}/novo?error=${SO_DONO}`);
  }
  await requireActiveSubscription(
    profile.corretora_id,
    "/painel/corretora/pagamentos",
  );

  const contratoParsed = uuidSchema.safeParse(
    String(formData.get("contrato_id") ?? "").trim(),
  );
  const valorBruto = parseBRL(formData.get("valor_bruto"));
  const descontos = parseBRL(formData.get("descontos")) ?? 0;
  const dataPrevista =
    String(formData.get("data_prevista") ?? "").trim() || null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  const back = "/painel/corretora/pagamentos/novo";
  const errors: string[] = [];
  if (!contratoParsed.success) errors.push("Selecione um contrato");
  if (valorBruto == null || valorBruto <= 0) errors.push("Valor bruto inválido");
  if (descontos < 0) errors.push("Descontos inválidos");
  if (valorBruto != null && descontos > valorBruto)
    errors.push("Descontos maiores que o valor bruto");
  if (errors.length > 0) {
    redirect(`${back}?error=${encodeURIComponent(errors.join(", "))}`);
  }

  const supabase = await createClient();

  // Deriva o produtor do contrato (e confirma que é da corretora).
  const { data: contrato } = await supabase
    .from("contratos")
    .select("id, produtor_id")
    // validado acima (redirect on !success)
    .eq("id", contratoParsed.data!)
    .eq("corretora_id", profile.corretora_id)
    .maybeSingle<{ id: string; produtor_id: string }>();
  if (!contrato) {
    redirect(`${back}?error=${encodeURIComponent("Contrato não encontrado.")}`);
  }

  const bruto = valorBruto as number;
  const liquido = bruto - descontos;

  const { data: novoPag, error } = await supabase
    .from("produtor_pagamentos")
    .insert({
      corretora_id: profile.corretora_id,
      produtor_id: contrato.produtor_id,
      contrato_id: contrato.id,
      valor_bruto: bruto,
      valor_liquido: liquido,
      descontos: descontos > 0 ? { total: descontos } : {},
      status: "pendente",
      data_prevista: dataPrevista,
      observacoes,
    })
    .select("id")
    .single();

  if (error || !novoPag) {
    const log = await getReqLogger({
      action: "createPagamento",
      corretoraId: profile.corretora_id,
      contratoId: contrato.id,
    });
    log.error("pagamento_insert_falhou", {
      code: error?.code,
      err: error ? safeError(error) : { message: "insert sem retorno" },
    });
    // 23505 = violação do índice unique parcial produtor_pagamentos_contrato_unico:
    // já existe um pagamento não-cancelado para este contrato (achado 6.1).
    if (error?.code === "23505") {
      redirect(
        `${back}?error=${encodeURIComponent("Já existe um repasse ativo para este contrato.")}`,
      );
    }
    redirect(
      `${back}?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  // Avisa o produtor: sininho in-app + WhatsApp automático (best-effort — o
  // WhatsApp depende do provider do send-dispatch; sem ele, fica enfileirado).
  await notify({
    userId: contrato.produtor_id,
    kind: "pagamento",
    title: "Repasse a receber",
    body: `A corretora registrou um repasse de ${BRL.format(liquido)} a receber.`,
    data: {
      pagamento_id: novoPag.id,
      contrato_id: contrato.id,
      href: "/painel/produtor/financeiro",
    },
  });

  revalidateAffected();
  redirect(
    "/painel/corretora/pagamentos?saved=" +
      encodeURIComponent("Repasse registrado."),
  );
}

/**
 * Marca um pagamento como pago (data_paga = hoje). Só registro/controle.
 */
export async function marcarPago(formData: FormData) {
  const profile = await ensureCorretora();
  if (!isCorretoraDono(profile)) {
    redirect(`${PAGAMENTOS}?error=${SO_DONO}`);
  }

  const idParsed = uuidSchema.safeParse(String(formData.get("id") ?? "").trim());
  if (!idParsed.success) redirect("/painel/corretora/pagamentos");
  const pagamentoId = idParsed.data;

  const supabase = await createClient();

  // Compare-and-set: só repasse EM ABERTO (pendente/vencido) pode ser marcado.
  // Evita re-marcar um já feito (sobrescrevendo comprovante/data) ou ressuscitar
  // um cancelado. Checa ANTES do upload pra não sobrescrever o arquivo à toa.
  const { data: atual } = await supabase
    .from("produtor_pagamentos")
    .select("status, produtor_id, valor_liquido")
    .eq("id", pagamentoId)
    .eq("corretora_id", profile.corretora_id)
    .maybeSingle<{
      status: string;
      produtor_id: string;
      valor_liquido: number | string;
    }>();
  if (!atual) redirect("/painel/corretora/pagamentos");
  if (atual.status !== "pendente" && atual.status !== "vencido") {
    redirect(
      `/painel/corretora/pagamentos?error=${encodeURIComponent(
        atual.status === "pago"
          ? "Este repasse já está marcado como feito."
          : "Este repasse foi cancelado — não dá pra marcar como feito.",
      )}`,
    );
  }

  // Comprovante: pode vir como ARQUIVO (campo "comprovante") ou, por
  // retrocompatibilidade, como texto livre (campo "comprovante_url").
  let comprovante: string | null =
    String(formData.get("comprovante_url") ?? "").trim() || null;

  const arquivo = formData.get("comprovante");
  if (arquivo instanceof File && arquivo.size > 0) {
    const tipoOk =
      arquivo.type.startsWith("image/") || arquivo.type === "application/pdf";
    if (!tipoOk) {
      redirect(
        `/painel/corretora/pagamentos?error=${encodeURIComponent("O comprovante precisa ser uma imagem ou PDF.")}`,
      );
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      redirect(
        `/painel/corretora/pagamentos?error=${encodeURIComponent("O comprovante deve ter no máximo 5MB.")}`,
      );
    }

    const ext =
      arquivo.type === "application/pdf"
        ? "pdf"
        : (arquivo.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "") ||
          (arquivo.type.split("/")[1] ?? "bin");
    // Path convention: {corretora_id}/{pagamento_id}.{ext}
    const path = `${profile.corretora_id}/${pagamentoId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("comprovantes")
      .upload(path, arquivo, { upsert: true, contentType: arquivo.type });

    if (uploadError) {
      const log = await getReqLogger({
        action: "marcarPago",
        corretoraId: profile.corretora_id,
        pagamentoId,
      });
      log.error("comprovante_upload_falhou", { err: safeError(uploadError) });
      redirect(
        `/painel/corretora/pagamentos?error=${encodeURIComponent("Não foi possível enviar o comprovante. Tente novamente.")}`,
      );
    }
    comprovante = path;
  }

  // Marcar como pago exige comprovante anexado (foto/PDF do PIX) — ação
  // crítica e irreversível na prática (o produtor passa a ver "pago").
  if (!comprovante) {
    redirect(
      `/painel/corretora/pagamentos?error=${encodeURIComponent("Anexe o comprovante para marcar o repasse como feito.")}`,
    );
  }

  // O .in("status", ...) é o compare-and-set de fato: se entre o check acima e
  // aqui o status mudou (corrida), nenhuma linha é atualizada.
  const { data: updated, error } = await supabase
    .from("produtor_pagamentos")
    .update({
      status: "pago",
      data_paga: new Date().toISOString().slice(0, 10),
      comprovante_url: comprovante,
    })
    .eq("id", pagamentoId)
    .eq("corretora_id", profile.corretora_id)
    .in("status", ["pendente", "vencido"])
    .select("id");

  if (error) {
    const log = await getReqLogger({
      action: "marcarPago",
      corretoraId: profile.corretora_id,
      pagamentoId,
    });
    log.error("pagamento_marcar_pago_falhou", {
      code: error.code,
      err: safeError(error),
    });
    redirect(
      `/painel/corretora/pagamentos?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }
  if (!updated || updated.length === 0) {
    redirect(
      `/painel/corretora/pagamentos?error=${encodeURIComponent("Este repasse já foi atualizado por outra ação. Recarregue a página.")}`,
    );
  }

  // Avisa o produtor que o dinheiro foi pago: sininho in-app + WhatsApp
  // automático (best-effort — WhatsApp depende do provider do send-dispatch).
  if (atual?.produtor_id) {
    await notify({
      userId: atual.produtor_id,
      kind: "pagamento",
      title: "Repasse confirmado",
      body: `Seu repasse de ${BRL.format(Number(atual.valor_liquido))} foi confirmado pela corretora.`,
      data: {
        pagamento_id: pagamentoId,
        href: "/painel/produtor/financeiro",
      },
    });
  }

  revalidateAffected();
  redirect(
    "/painel/corretora/pagamentos?saved=" +
      encodeURIComponent("Repasse marcado como feito."),
  );
}

/**
 * Cancela um registro de pagamento (status = cancelado). Não apaga histórico.
 */
export async function cancelarPagamento(formData: FormData) {
  const profile = await ensureCorretora();
  if (!isCorretoraDono(profile)) {
    redirect(`${PAGAMENTOS}?error=${SO_DONO}`);
  }

  const idParsed = uuidSchema.safeParse(String(formData.get("id") ?? "").trim());
  if (!idParsed.success) redirect("/painel/corretora/pagamentos");

  const supabase = await createClient();
  // Só cancela repasse EM ABERTO: não faz sentido cancelar um já feito
  // (tem comprovante) — e o .in evita isso de forma atômica.
  const { data: updated, error } = await supabase
    .from("produtor_pagamentos")
    .update({ status: "cancelado" })
    .eq("id", idParsed.data)
    .eq("corretora_id", profile.corretora_id)
    .in("status", ["pendente", "vencido"])
    .select("id");

  if (error) {
    const log = await getReqLogger({
      action: "cancelarPagamento",
      corretoraId: profile.corretora_id,
      pagamentoId: idParsed.data,
    });
    log.error("pagamento_cancelar_falhou", {
      code: error.code,
      err: safeError(error),
    });
    redirect(
      `/painel/corretora/pagamentos?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }
  if (!updated || updated.length === 0) {
    redirect(
      `/painel/corretora/pagamentos?error=${encodeURIComponent("Só dá pra cancelar um repasse em aberto.")}`,
    );
  }

  revalidateAffected();
  redirect(
    "/painel/corretora/pagamentos?saved=" +
      encodeURIComponent("Repasse cancelado."),
  );
}
