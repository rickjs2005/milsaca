"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { friendlyPostgresError } from "@/lib/postgres-error";

/**
 * Marca um system_event failed/skipped como pending pra retomada.
 * A função SQL `reprocess_system_event` checa is_admin() de novo.
 */
export async function reprocessEvent(formData: FormData) {
  const user = await requireAppAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/fila-eventos?error=ID%20inv%C3%A1lido");

  const supabase = await createClient();
  const { error } = await supabase.rpc("reprocess_system_event", {
    p_event_id: id,
  });

  if (error) {
    redirect(
      `/admin/fila-eventos?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "reprocess_event",
    entity: "system_events",
    entity_id: id,
    payload: {},
  });

  revalidatePath("/admin/fila-eventos");
  redirect("/admin/fila-eventos?ok=Evento%20reagendado");
}
