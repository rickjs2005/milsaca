"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";

const VALID = ["aguardando", "convidada", "entrou", "descartada"] as const;

export async function setCorretoraWaitlistStatus(formData: FormData) {
  const user = await requireAppAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!id || !(VALID as readonly string[]).includes(status)) {
    redirect("/admin/corretoras-espera?error=Status%20inv%C3%A1lido");
  }

  const supabase = await createClient();
  const updates: Record<string, unknown> = { status };
  // Marca a hora do convite quando passa pra "convidada".
  if (status === "convidada") updates.invited_at = new Date().toISOString();

  const { error } = await supabase
    .from("corretora_waitlist")
    .update(updates)
    .eq("id", id);

  if (error) {
    const log = await getReqLogger({
      action: "setCorretoraWaitlistStatus",
      userId: user.id,
      entityId: id,
    });
    log.error("corretora_waitlist_update_falhou", {
      code: error.code,
      err: safeError(error),
    });
    redirect(
      `/admin/corretoras-espera?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  const { error: auditErr } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: `corretora_waitlist_${status}`,
    entity: "corretora_waitlist",
    entity_id: id,
    payload: {},
  });
  if (auditErr) {
    const log = await getReqLogger({
      action: "setCorretoraWaitlistStatus",
      userId: user.id,
      entityId: id,
    });
    log.warn("audit_insert_falhou", { err: safeError(auditErr) });
  }

  revalidatePath("/admin/corretoras-espera");
  redirect("/admin/corretoras-espera?ok=Status%20atualizado");
}
