"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getUser } from "@/lib/auth";

function clean(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

export async function updatePerfilCorretora(formData: FormData) {
  const user = await getUser();
  if (!user) redirect("/entrar");

  const full_name = clean(formData.get("full_name"));
  const phone = clean(formData.get("phone"));

  if (!full_name) {
    redirect(
      "/painel/corretora/perfil?error=" +
        encodeURIComponent("Nome obrigatório"),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name, phone })
    .eq("id", user.id);

  if (error) {
    redirect(
      `/painel/corretora/perfil?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/painel/corretora/perfil");
  revalidatePath("/painel/corretora");
  redirect("/painel/corretora/perfil?saved=1");
}
