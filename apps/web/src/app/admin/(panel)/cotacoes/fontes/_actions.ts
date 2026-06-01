"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { getReqLogger } from "@/lib/req-logger";
import { safeError } from "@/lib/logger";

export async function toggleSourceActive(formData: FormData) {
  const user = await requireAppAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const next = formData.get("active") === "true";
  if (!id) redirect("/admin/cotacoes/fontes?error=ID%20inv%C3%A1lido");

  const log = await getReqLogger({ action: "toggleSourceActive", sourceId: id });
  const supabase = await createClient();
  const { error } = await supabase
    .from("quote_sources")
    .update({ active: next })
    .eq("id", id);
  if (error) {
    log.error("quote_source_update_falhou", {
      err: safeError(error),
      code: error.code,
    });
    redirect(
      `/admin/cotacoes/fontes?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  const { error: auditError } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: next ? "activate_quote_source" : "deactivate_quote_source",
    entity: "quote_sources",
    entity_id: id,
  });
  if (auditError) {
    log.warn("audit_insert_falhou", {
      err: safeError(auditError),
      code: auditError.code,
    });
  }

  revalidatePath("/admin/cotacoes/fontes");
  redirect(
    `/admin/cotacoes/fontes?ok=${next ? "Fonte%20ativada" : "Fonte%20desativada"}`,
  );
}
