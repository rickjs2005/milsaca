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
import { LOTE_STATUS_ORDER, type LoteStatus } from "./_lib/lote-meta";

function isLoteStatus(v: string): v is LoteStatus {
  return (LOTE_STATUS_ORDER as readonly string[]).includes(v);
}

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

/**
 * Move o status do lote. Defesa em profundidade: filtra por corretora_id
 * além da RLS (impede id de outra corretora bater por engano).
 */
export async function updateLoteStatus(formData: FormData) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  await requireActiveSubscription(
    profile.corretora_id,
    "/painel/corretora/lotes",
  );

  const id = String(formData.get("id") ?? "").trim();
  const next = String(formData.get("status") ?? "").trim();
  if (!id || !isLoteStatus(next)) redirect("/painel/corretora/lotes");

  const supabase = await createClient();
  const { error } = await supabase
    .from("lotes")
    .update({ status: next as LoteStatus })
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id);

  if (error) {
    const params = new URLSearchParams({
      error: friendlyPostgresError(error),
    });
    redirect(`/painel/corretora/lotes?${params.toString()}`);
  }

  revalidatePath("/painel/corretora/lotes");
  revalidatePath(`/painel/corretora/lotes/${id}`);
  revalidatePath("/painel/corretora");
  redirect("/painel/corretora/lotes?ok=Status%20atualizado");
}
