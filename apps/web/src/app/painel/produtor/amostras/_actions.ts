"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@milsaca/db/web/server";
import { requireUser } from "@/lib/auth";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";

const AMOSTRAS = "/painel/produtor/amostras";

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

const erro = (msg: string): never =>
  redirect(`${AMOSTRAS}?error=${encodeURIComponent(msg)}`);

const agendarSchema = z.object({
  lote_id: z.string().uuid({ message: "Escolha um lote." }),
  corretora_id: z.string().uuid({ message: "Escolha uma corretora." }),
  // date opcional (YYYY-MM-DD vindo de <input type="date">).
  data_entrega_prevista: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  mensagem: optText(500),
});

export async function agendarAmostra(formData: FormData) {
  const user = await requireUser(AMOSTRAS);

  const parsed = agendarSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    redirect(
      `${AMOSTRAS}?error=${encodeURIComponent(
        parsed.error.issues.map((i) => i.message).join("; "),
      )}`,
    );
  }
  const f = parsed.data;

  const supabase = await createClient();

  const { error } = await supabase.from("amostras").insert({
    produtor_id: user.id,
    lote_id: f.lote_id,
    corretora_id: f.corretora_id,
    data_entrega_prevista: f.data_entrega_prevista,
    mensagem: f.mensagem,
    status: "agendada",
  });

  if (error) {
    const log = await getReqLogger({
      action: "agendarAmostra",
      userId: user.id,
    });
    log.error("agendar_amostra_falhou", {
      code: error.code,
      err: safeError(error),
    });
    // unique(lote_id, corretora_id): já existe amostra dessa corretora pro lote.
    if (error.code === "23505") {
      erro("Você já agendou uma amostra desse lote para esta corretora.");
    }
    erro(friendlyPostgresError(error));
  }

  revalidatePath(AMOSTRAS);
  redirect(
    `${AMOSTRAS}?ok=${encodeURIComponent(
      "Entrega de amostra agendada. Leve a amostra na corretora.",
    )}`,
  );
}

const cancelarSchema = z.object({
  id: z.string().uuid(),
});

export async function cancelarAmostra(formData: FormData) {
  const user = await requireUser(AMOSTRAS);

  const parsed = cancelarSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    erro("Amostra inválida.");
  } else {
    const supabase = await createClient();

    const { error } = await supabase
      .from("amostras")
      .update({ status: "cancelada" })
      .eq("id", parsed.data.id)
      .eq("produtor_id", user.id)
      .in("status", ["agendada", "recebida"]);

    if (error) {
      const log = await getReqLogger({
        action: "cancelarAmostra",
        userId: user.id,
      });
      log.error("cancelar_amostra_falhou", {
        code: error.code,
        err: safeError(error),
      });
      erro(friendlyPostgresError(error));
    }
  }

  revalidatePath(AMOSTRAS);
  redirect(
    `${AMOSTRAS}?ok=${encodeURIComponent("Amostra cancelada.")}`,
  );
}
