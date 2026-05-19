"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getProfile, requireUser } from "@/lib/auth";
import {
  citySchema,
  cnpjSchema,
  phoneBROptionalSchema,
  ufSchema,
  whatsappSchema,
} from "@/lib/brasil-schemas";

function clean(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

function cleanDigits(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").replace(/\D/g, "");
  return s || null;
}

function redirectError(msg: string): never {
  redirect(`/onboarding/corretora?error=${encodeURIComponent(msg)}`);
}

export async function completarOnboardingCorretora(formData: FormData) {
  const user = await requireUser("/onboarding/corretora");
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const full_name = clean(formData.get("full_name"));
  const cnpjRaw = String(formData.get("cnpj") ?? "");
  const phoneRaw = String(formData.get("phone") ?? "");
  const cityRaw = String(formData.get("city") ?? "");
  const stateRaw = String(formData.get("state") ?? "");
  const telefoneFixoRaw = String(formData.get("telefone_fixo") ?? "");
  const cep = cleanDigits(formData.get("cep"));
  const endereco = clean(formData.get("endereco"));
  const bairro = clean(formData.get("bairro"));
  const descricao = clean(formData.get("descricao"));
  const site_url = clean(formData.get("site_url"));

  if (!full_name) redirectError("Preencha seu nome.");

  const cnpjParsed = cnpjSchema.safeParse(cnpjRaw);
  if (!cnpjParsed.success) redirectError("Informe um CNPJ válido.");
  const cnpj = cnpjParsed.data;

  const phoneParsed = whatsappSchema.safeParse(phoneRaw);
  if (!phoneParsed.success) redirectError("Informe um WhatsApp válido com DDD.");
  const phone = phoneParsed.data;

  const cityParsed = citySchema.safeParse(cityRaw);
  if (!cityParsed.success) redirectError("Cidade inválida.");
  const city = cityParsed.data;

  const stateParsed = ufSchema.safeParse(stateRaw);
  if (!stateParsed.success) redirectError("Selecione o estado.");
  const state = stateParsed.data;

  // Telefone fixo é opcional — só valida formato se preenchido.
  const fixoParsed = phoneBROptionalSchema.safeParse(telefoneFixoRaw);
  if (!fixoParsed.success) redirectError("Telefone fixo inválido.");
  const telefone_fixo = fixoParsed.data;

  const supabase = await createClient();

  const { error: pErr } = await supabase
    .from("profiles")
    .update({ full_name, phone })
    .eq("id", user.id);
  if (pErr) redirectError(pErr.message);

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
  if (cErr) redirectError(cErr.message);

  revalidatePath("/painel/corretora");
  revalidatePath("/admin/corretoras");
  redirect("/painel/corretora?ok=Onboarding%20conclu%C3%ADdo");
}
