"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { friendlyPostgresError } from "@/app/admin/(panel)/_lib/errors";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import {
  SETTING_SECTIONS,
  SETTING_TYPES,
  type SettingKey,
} from "./_lib/settings";

/**
 * Atualiza todas as settings de uma vez. Form pode submeter só os
 * campos editados — chaves não presentes preservam o valor atual.
 *
 * Cada valor é castado pro tipo correto baseado em SETTING_TYPES e
 * salvo como JSONB (boolean → true/false, number → 30, string → "foo").
 */
export async function updateSettings(formData: FormData) {
  const user = await requireAppAdmin();

  const allKeys = SETTING_SECTIONS.flatMap((s) => s.keys);
  const updates: { key: SettingKey; value: unknown }[] = [];

  for (const key of allKeys) {
    const type = SETTING_TYPES[key];
    const raw = formData.get(key);

    // Boolean vem como "on"/null (checkbox). Os demais como string.
    if (type.kind === "boolean") {
      updates.push({ key, value: raw === "on" });
      continue;
    }

    if (raw == null) continue;
    const s = String(raw).trim();

    if (type.kind === "number") {
      const n = Number(s);
      if (!Number.isFinite(n)) continue;
      const clamped =
        type.min != null && n < type.min
          ? type.min
          : type.max != null && n > type.max
            ? type.max
            : n;
      updates.push({ key, value: clamped });
    } else if (type.kind === "select" || type.kind === "string") {
      if (s.length === 0) continue;
      updates.push({ key, value: s });
    }
  }

  if (updates.length === 0) {
    redirect("/admin/configuracoes?ok=Nada%20a%20salvar");
  }

  const supabase = await createClient();

  // Upsert por chave. Updated_by não é FK obrigatória mas registra autoria.
  const { error } = await supabase
    .from("platform_settings")
    .upsert(
      updates.map((u) => ({
        key: u.key,
        value: u.value,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "key" },
    );

  if (error) {
    const log = await getReqLogger({
      action: "updateSettings",
      userId: user.id,
    });
    log.error("update_settings_falhou", {
      total: updates.length,
      code: error.code,
      err: safeError(error),
    });
    const friendly = friendlyPostgresError(error);
    redirect(
      `/admin/configuracoes?error=${encodeURIComponent(friendly)}`,
    );
  }

  const { error: auditErr } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "update_settings",
    entity: "platform_settings",
    payload: { keys: updates.map((u) => u.key), total: updates.length },
  });
  if (auditErr) {
    const log = await getReqLogger({
      action: "updateSettings",
      userId: user.id,
    });
    log.warn("audit_insert_falhou", { err: safeError(auditErr) });
  }

  revalidatePath("/admin/configuracoes");
  redirect(
    `/admin/configuracoes?ok=${encodeURIComponent(`${updates.length} configuração${updates.length === 1 ? "" : "ões"} salva${updates.length === 1 ? "" : "s"}`)}`,
  );
}
