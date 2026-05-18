"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import { friendlyPostgresError } from "@/lib/postgres-error";

function clean(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function cleanEmail(v: FormDataEntryValue | null): string | null {
  const s = clean(v);
  if (!s) return null;
  return s.toLowerCase();
}

export async function createContato(formData: FormData) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const full_name = clean(formData.get("full_name"));
  const email = cleanEmail(formData.get("email"));
  const phone = clean(formData.get("phone"));
  const fazenda_nome = clean(formData.get("fazenda_nome"));
  const city = clean(formData.get("city"));
  const state = clean(formData.get("state"));
  const notes = clean(formData.get("notes"));

  const errors: string[] = [];
  if (!full_name) errors.push("Nome obrigatório");
  if (!email && !phone) errors.push("Informe email ou telefone");

  if (errors.length > 0) {
    const params = new URLSearchParams({ error: errors.join(", ") });
    redirect(`/painel/corretora/produtores/novo?${params.toString()}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("produtor_contatos")
    .insert({
      corretora_id: profile.corretora_id,
      full_name: full_name as string,
      email,
      phone,
      fazenda_nome,
      city,
      state,
      notes,
    })
    .select("id")
    .single();

  if (error) {
    const params = new URLSearchParams({ error: friendlyPostgresError(error) });
    redirect(`/painel/corretora/produtores/novo?${params.toString()}`);
  }

  revalidatePath("/painel/corretora/produtores");
  redirect(`/painel/corretora/produtores/contatos/${data.id}`);
}

export async function updateContato(formData: FormData) {
  const profile = await getProfile();
  if (!profile?.corretora_id) redirect("/painel");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/painel/corretora/produtores");

  const full_name = clean(formData.get("full_name"));
  const email = cleanEmail(formData.get("email"));
  const phone = clean(formData.get("phone"));
  const fazenda_nome = clean(formData.get("fazenda_nome"));
  const city = clean(formData.get("city"));
  const state = clean(formData.get("state"));
  const notes = clean(formData.get("notes"));

  if (!full_name) {
    const params = new URLSearchParams({ error: "Nome obrigatório" });
    redirect(
      `/painel/corretora/produtores/contatos/${id}?${params.toString()}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("produtor_contatos")
    .update({
      full_name: full_name as string,
      email,
      phone,
      fazenda_nome,
      city,
      state,
      notes,
    })
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id);

  if (error) {
    const params = new URLSearchParams({ error: friendlyPostgresError(error) });
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
