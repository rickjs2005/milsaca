"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { friendlyPostgresError } from "@/lib/postgres-error";

const VALID_RESOLUTIONS = ["actioned", "dismissed", "reviewing"] as const;

export async function resolveReport(formData: FormData) {
  const user = await requireAppAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const resolution = String(formData.get("resolution") ?? "").trim() || null;

  if (!id || !(VALID_RESOLUTIONS as readonly string[]).includes(status)) {
    redirect("/admin/moderacao?error=Status%20inv%C3%A1lido");
  }

  const supabase = await createClient();
  const isFinal = status === "actioned" || status === "dismissed";

  const { error } = await supabase
    .from("moderation_reports")
    .update({
      status,
      resolution,
      resolved_by: isFinal ? user.id : null,
      resolved_at: isFinal ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/moderacao?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: `moderation_${status}`,
    entity: "moderation_reports",
    entity_id: id,
    payload: { resolution },
  });

  revalidatePath("/admin/moderacao");
  redirect(`/admin/moderacao?ok=Den%C3%BAncia%20atualizada`);
}
