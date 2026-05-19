"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import { friendlyPostgresError } from "@/lib/postgres-error";
import {
  createProdutorContatoSchema,
  flattenZodErrors,
  formDataToObject,
} from "../_lib/schemas";

export async function createContato(formData: FormData) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const parsed = createProdutorContatoSchema.safeParse(
    formDataToObject(formData),
  );
  if (!parsed.success) {
    const params = new URLSearchParams({
      error: flattenZodErrors(parsed.error),
    });
    redirect(`/painel/corretora/produtores/novo?${params.toString()}`);
  }
  const data = parsed.data;
  if (!data.email && !data.phone) {
    const params = new URLSearchParams({
      error: "Informe email ou telefone.",
    });
    redirect(`/painel/corretora/produtores/novo?${params.toString()}`);
  }

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("produtor_contatos")
    .insert({
      corretora_id: profile.corretora_id,
      ...data,
    })
    .select("id")
    .single();

  if (error) {
    const params = new URLSearchParams({
      error: friendlyPostgresError(error),
    });
    redirect(`/painel/corretora/produtores/novo?${params.toString()}`);
  }

  revalidatePath("/painel/corretora/produtores");
  redirect(`/painel/corretora/produtores/contatos/${inserted.id}`);
}

export async function updateContato(formData: FormData) {
  const profile = await getProfile();
  if (!profile?.corretora_id) redirect("/painel");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/painel/corretora/produtores");

  const parsed = createProdutorContatoSchema.safeParse(
    formDataToObject(formData),
  );
  if (!parsed.success) {
    const params = new URLSearchParams({
      error: flattenZodErrors(parsed.error),
    });
    redirect(
      `/painel/corretora/produtores/contatos/${id}?${params.toString()}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("produtor_contatos")
    .update(parsed.data)
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id);

  if (error) {
    const params = new URLSearchParams({
      error: friendlyPostgresError(error),
    });
    redirect(
      `/painel/corretora/produtores/contatos/${id}?${params.toString()}`,
    );
  }

  revalidatePath("/painel/corretora/produtores");
  revalidatePath(`/painel/corretora/produtores/contatos/${id}`);
  redirect(`/painel/corretora/produtores/contatos/${id}?saved=1`);
}

export async function deleteContato(formData: FormData) {
  const profile = await getProfile();
  if (!profile?.corretora_id) redirect("/painel");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/painel/corretora/produtores");

  const supabase = await createClient();

  // Bloqueia delete se houver leads vinculados ao contato
  const { count } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("contato_id", id);

  if ((count ?? 0) > 0) {
    const params = new URLSearchParams({
      error: `Esse contato tem ${count} lead(s) vinculado(s). Apague ou converta os leads antes.`,
    });
    redirect(
      `/painel/corretora/produtores/contatos/${id}?${params.toString()}`,
    );
  }

  await supabase
    .from("produtor_contatos")
    .delete()
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id);

  revalidatePath("/painel/corretora/produtores");
  redirect("/painel/corretora/produtores");
}
