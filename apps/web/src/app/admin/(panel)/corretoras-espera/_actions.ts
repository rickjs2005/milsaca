"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { friendlyPostgresError } from "@/lib/postgres-error";

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
    redirect(
      `/admin/corretoras-espera?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: `corretora_waitlist_${status}`,
    entity: "corretora_waitlist",
    entity_id: id,
    payload: {},
  });

  revalidatePath("/admin/corretoras-espera");
  redirect("/admin/corretoras-espera?ok=Status%20atualizado");
}
