"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getUser } from "@/lib/auth";

export async function toggleFavorito(formData: FormData) {
  const user = await getUser();
  if (!user) redirect("/entrar");

  const corretoraId = String(formData.get("corretora_id") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();
  if (!corretoraId) redirect("/painel/produtor/corretoras");

  const supabase = await createClient();

  if (action === "remove") {
    await supabase
      .from("favoritos")
      .delete()
      .eq("produtor_id", user.id)
      .eq("corretora_id", corretoraId);
  } else {
    // upsert manual via on-conflict do unique(produtor_id, corretora_id)
    await supabase.from("favoritos").insert({
      produtor_id: user.id,
      corretora_id: corretoraId,
    });
  }

  revalidatePath("/painel/produtor/corretoras");
  revalidatePath("/painel/produtor");
}
