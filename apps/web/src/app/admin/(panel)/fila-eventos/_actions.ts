"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { getReqLogger } from "@/lib/req-logger";
import { safeError } from "@/lib/logger";

/**
 * Marca um system_event failed/skipped como pending pra retomada.
 * A função SQL `reprocess_system_event` checa is_admin() de novo.
 */
export async function reprocessEvent(formData: FormData) {
  const user = await requireAppAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/fila-eventos?error=ID%20inv%C3%A1lido");

  const log = await getReqLogger({ action: "reprocessEvent", eventId: id });
  const supabase = await createClient();
  const { error } = await supabase.rpc("reprocess_system_event", {
    p_event_id: id,
  });

  if (error) {
    log.error("reprocess_event_rpc_falhou", {
      err: safeError(error),
      code: error.code,
    });
    redirect(
      `/admin/fila-eventos?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  const { error: auditError } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "reprocess_event",
    entity: "system_events",
    entity_id: id,
    payload: {},
  });
  if (auditError) {
    log.warn("audit_insert_falhou", {
      err: safeError(auditError),
      code: auditError.code,
    });
  }

  revalidatePath("/admin/fila-eventos");
  redirect("/admin/fila-eventos?ok=Evento%20reagendado");
}
