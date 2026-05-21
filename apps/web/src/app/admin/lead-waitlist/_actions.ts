"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { friendlyPostgresError } from "@/lib/postgres-error";

const VALID = ["pending", "contacted", "converted", "dropped"] as const;

export async function setWaitlistStatus(formData: FormData) {
  const user = await requireAppAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!id || !(VALID as readonly string[]).includes(status)) {
    redirect("/admin/lead-waitlist?error=Status%20inv%C3%A1lido");
  }

  const supabase = await createClient();
  const isFinal = status === "converted" || status === "dropped";

  const updates: Record<string, unknown> = {
    status,
    handled_by: status !== "pending" ? user.id : null,
    handled_at: isFinal ? new Date().toISOString() : null,
  };
  if (notes) updates.notes = notes;

  const { error } = await supabase
    .from("lead_waitlist")
    .update(updates)
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/lead-waitlist?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: `waitlist_${status}`,
    entity: "lead_waitlist",
    entity_id: id,
    payload: { notes },
  });

  revalidatePath("/admin/lead-waitlist");
  redirect("/admin/lead-waitlist?ok=Status%20atualizado");
}
