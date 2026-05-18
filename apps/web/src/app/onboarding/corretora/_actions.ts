"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getProfile, requireUser } from "@/lib/auth";

function clean(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

function cleanDigits(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").replace(/\D/g, "");
  return s || null;
}

export async function completarOnboardingCorretora(formData: FormData) {
  const user = await requireUser("/onboarding/corretora");
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const full_name = clean(formData.get("full_name"));
  const cnpj = cleanDigits(formData.get("cnpj"));
  const phone = clean(formData.get("phone"));
  const city = clean(formData.get("city"));
  const state = clean(formData.get("state"))?.toUpperCase().slice(0, 2) ?? null;
  const cep = cleanDigits(formData.get("cep"));
  const endereco = clean(formData.get("endereco"));
  const bairro = clean(formData.get("bairro"));
  const descricao = clean(formData.get("descricao"));
  const telefone_fixo = clean(formData.get("telefone_fixo"));
  const site_url = clean(formData.get("site_url"));

  const missing: string[] = [];
  if (!full_name) missing.push("seu nome");
  if (!cnpj) missing.push("CNPJ");
  if (!phone) missing.push("WhatsApp");
  if (!city || !state) missing.push("cidade/UF");

  if (missing.length > 0) {
    redirect(
      `/onboarding/corretora?error=${encodeURIComponent("Preencha: " + missing.join(", "))}`,
    );
  }

  const supabase = await createClient();

  const { error: pErr } = await supabase
    .from("profiles")
    .update({ full_name, phone })
    .eq("id", user.id);
  if (pErr) {
    redirect(
      `/onboarding/corretora?error=${encodeURIComponent(pErr.message)}`,
    );
  }

  const { error: cErr } = await supabase
    .from("corretoras")
    .update({
      cnpj,
      phone,
      city,
      state,
      cep,
      endereco,
      bairro,
      descricao,
      telefone_fixo,
      site_url,
    })
    .eq("id", profile.corretora_id);
  if (cErr) {
    redirect(
      `/onboarding/corretora?error=${encodeURIComponent(cErr.message)}`,
    );
  }

  revalidatePath("/painel/corretora");
  revalidatePath("/admin/corretoras");
  redirect("/painel/corretora?ok=Onboarding%20conclu%C3%ADdo");
}
