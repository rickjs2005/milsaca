"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { requireActiveSubscription } from "../_lib/corretora";
import {
  createLoteSchema,
  flattenZodErrors,
  formDataToObject,
} from "../_lib/schemas";

export async function createLote(formData: FormData) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  await requireActiveSubscription(
    profile.corretora_id,
    "/painel/corretora/lotes",
  );

  const parsed = createLoteSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    const params = new URLSearchParams({
      error: flattenZodErrors(parsed.error),
    });
    redirect(`/painel/corretora/lotes/novo?${params.toString()}`);
  }
  const fields = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lotes")
    .insert({
      corretora_id: profile.corretora_id,
      ...fields,
      status: "aguardando_classificacao",
    })
    .select("id")
    .single();

  if (error) {
    const params = new URLSearchParams({
      error: friendlyPostgresError(error),
    });
    redirect(`/painel/corretora/lotes/novo?${params.toString()}`);
  }

  revalidatePath("/painel/corretora/lotes");
  redirect(`/painel/corretora/lotes/${data.id}`);
}
