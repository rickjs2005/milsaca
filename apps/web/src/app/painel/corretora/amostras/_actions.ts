"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@milsaca/db/web/server";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import { notify } from "@/lib/notify";
import { getCorretoraName, ensureCorretora } from "../_lib/corretora";
import { formDataToObject, flattenZodErrors, uuidSchema } from "../_lib/schemas";

const ROUTE = "/painel/corretora/amostras";

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function redirectOk(msg: string): never {
  redirect(`${ROUTE}?ok=${encodeURIComponent(msg)}`);
}

function redirectErr(msg: string): never {
  redirect(`${ROUTE}?error=${encodeURIComponent(msg)}`);
}

const moneyBRL = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

// Decimal vindo do form pode chegar "1.234,56" ou "1234.56" — normaliza
// (espelha o helper `decimal` de ../_lib/schemas, exigindo valor presente).
const precoSchema = z
  .union([z.string(), z.number()])
  .transform((v) => {
    if (v == null || v === "") return null;
    const s = String(v)
      .trim()
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 ? n : null;
  });

/**
 * Busca a amostra da corretora (defesa em profundidade: filtra corretora_id
 * além da RLS). Retorna produtor_id pra notificar e o status atual pro
 * compare-and-set.
 */
async function loadAmostraDaCorretora(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  corretoraId: string,
) {
  const { data } = await supabase
    .from("amostras")
    .select("id, status, produtor_id")
    .eq("id", id)
    .eq("corretora_id", corretoraId)
    .maybeSingle<{
      id: string;
      status: "agendada" | "recebida" | "classificada" | "recusada" | "cancelada";
      produtor_id: string;
    }>();
  return data ?? null;
}

export async function marcarRecebida(formData: FormData) {
  const profile = await ensureCorretora();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "").trim();
  if (!uuidSchema.safeParse(id).success) redirectErr("Amostra inválida.");

  const amostra = await loadAmostraDaCorretora(supabase, id, profile.corretora_id);
  if (!amostra) redirectErr("Amostra não encontrada.");

  // Compare-and-set: só 'agendada' → 'recebida'.
  const { data: updated, error } = await supabase
    .from("amostras")
    .update({ status: "recebida", data_recebida: hoje() })
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id)
    .eq("status", "agendada")
    .select("id");

  if (error) {
    const log = await getReqLogger({
      action: "marcarRecebida",
      corretoraId: profile.corretora_id,
    });
    log.error("amostra_recebida_falhou", {
      code: error.code,
      err: safeError(error),
    });
    redirectErr(friendlyPostgresError(error, "Erro ao marcar recebida"));
  }
  if (!updated || updated.length === 0) {
    redirectErr("A amostra já mudou de status. Recarregue.");
  }

  const corretoraNome = await getCorretoraName(profile.corretora_id);
  await notify({
    userId: amostra.produtor_id,
    kind: "sistema",
    title: "Sua amostra chegou",
    body: `${corretoraNome} recebeu sua amostra e vai analisar.`,
    data: { amostra_id: id, href: "/painel/produtor" },
  });

  revalidatePath(ROUTE);
  redirectOk("Amostra marcada como recebida");
}

const laudoSchema = z.object({
  resultado_bebida: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  resultado_tipo: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  resultado_fora_de_tipo: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "true" || v === "on" || v === "1"),
  preco_oferta: precoSchema,
  laudo_observacoes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export async function enviarLaudo(formData: FormData) {
  const profile = await ensureCorretora();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "").trim();
  if (!uuidSchema.safeParse(id).success) redirectErr("Amostra inválida.");

  const parsed = laudoSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) redirectErr(flattenZodErrors(parsed.error));
  const fields = parsed.data;

  const amostra = await loadAmostraDaCorretora(supabase, id, profile.corretora_id);
  if (!amostra) redirectErr("Amostra não encontrada.");

  // Compare-and-set: aceita laudo de 'recebida' ou direto de 'agendada'.
  const { data: updated, error } = await supabase
    .from("amostras")
    .update({
      status: "classificada",
      data_resultado: hoje(),
      resultado_bebida: fields.resultado_bebida,
      resultado_tipo: fields.resultado_tipo,
      resultado_fora_de_tipo: fields.resultado_fora_de_tipo,
      preco_oferta: fields.preco_oferta,
      laudo_observacoes: fields.laudo_observacoes,
    })
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id)
    .in("status", ["recebida", "agendada"])
    .select("id");

  if (error) {
    const log = await getReqLogger({
      action: "enviarLaudo",
      corretoraId: profile.corretora_id,
    });
    log.error("amostra_laudo_falhou", {
      code: error.code,
      err: safeError(error),
    });
    redirectErr(friendlyPostgresError(error, "Erro ao enviar laudo"));
  }
  if (!updated || updated.length === 0) {
    redirectErr("A amostra já mudou de status. Recarregue.");
  }

  const corretoraNome = await getCorretoraName(profile.corretora_id);
  const bebida = fields.resultado_bebida ?? "—";
  const tipo = fields.resultado_fora_de_tipo
    ? "Fora de tipo"
    : (fields.resultado_tipo ?? "—");
  const precoTxt =
    fields.preco_oferta != null ? moneyBRL(fields.preco_oferta) : "—";
  await notify({
    userId: amostra.produtor_id,
    kind: "cotacao",
    title: "Laudo da sua amostra",
    body: `${corretoraNome}: ${bebida}/${tipo} · pagaria ${precoTxt}/saca`,
    data: { amostra_id: id, href: "/painel/produtor" },
  });

  revalidatePath(ROUTE);
  redirectOk("Laudo enviado ao produtor");
}

const recusaSchema = z.object({
  motivo_recusa: z
    .string({ message: "Motivo obrigatório." })
    .trim()
    .min(1, { message: "Motivo obrigatório." })
    .max(500, { message: "Motivo muito longo." }),
});

export async function recusarAmostra(formData: FormData) {
  const profile = await ensureCorretora();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "").trim();
  if (!uuidSchema.safeParse(id).success) redirectErr("Amostra inválida.");

  const parsed = recusaSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) redirectErr(flattenZodErrors(parsed.error));
  const { motivo_recusa } = parsed.data;

  const amostra = await loadAmostraDaCorretora(supabase, id, profile.corretora_id);
  if (!amostra) redirectErr("Amostra não encontrada.");

  // Compare-and-set: recusa de 'agendada' ou 'recebida'.
  const { data: updated, error } = await supabase
    .from("amostras")
    .update({ status: "recusada", motivo_recusa })
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id)
    .in("status", ["agendada", "recebida"])
    .select("id");

  if (error) {
    const log = await getReqLogger({
      action: "recusarAmostra",
      corretoraId: profile.corretora_id,
    });
    log.error("amostra_recusa_falhou", {
      code: error.code,
      err: safeError(error),
    });
    redirectErr(friendlyPostgresError(error, "Erro ao recusar amostra"));
  }
  if (!updated || updated.length === 0) {
    redirectErr("A amostra já mudou de status. Recarregue.");
  }

  await notify({
    userId: amostra.produtor_id,
    kind: "sistema",
    title: "Amostra recusada",
    body: motivo_recusa,
    data: { amostra_id: id, href: "/painel/produtor" },
  });

  revalidatePath(ROUTE);
  redirectOk("Amostra recusada");
}
