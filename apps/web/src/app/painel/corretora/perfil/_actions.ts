"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getUser } from "@/lib/auth";
import { friendlyPostgresError } from "@/lib/postgres-error";
import {
  flattenZodErrors,
  formDataToObject,
  perfilCorretoraSchema,
} from "../_lib/schemas";

export async function updatePerfilCorretora(formData: FormData) {
  const user = await getUser();
  if (!user) redirect("/entrar");

  const parsed = perfilCorretoraSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    redirect(
      `/painel/corretora/perfil?error=${encodeURIComponent(flattenZodErrors(parsed.error))}`,
    );
  }
  const { full_name, phone } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name, phone })
    .eq("id", user.id);

  if (error) {
    redirect(
      `/painel/corretora/perfil?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  revalidatePath("/painel/corretora/perfil");
  revalidatePath("/painel/corretora");
  redirect("/painel/corretora/perfil?saved=1");
}
