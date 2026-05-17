"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getProfile, requireUser } from "@/lib/auth";
import type { ProdutorSpecie } from "@/app/painel/produtor/_lib/produtor";

const VALID_SPECIE: ProdutorSpecie[] = ["arabica", "conilon", "ambos"];

function clean(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

function cleanDigits(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").replace(/\D/g, "");
  return s || null;
}

function parseSpecie(v: FormDataEntryValue | null): ProdutorSpecie | null {
  const s = String(v ?? "").trim();
  return VALID_SPECIE.includes(s as ProdutorSpecie)
    ? (s as ProdutorSpecie)
    : null;
}

export async function completarOnboarding(formData: FormData) {
  const user = await requireUser("/onboarding/produtor");
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  const full_name = clean(formData.get("full_name"));
  const cpf_cnpj = cleanDigits(formData.get("cpf_cnpj"));
  const whatsapp = clean(formData.get("whatsapp"));
  const fazenda_nome = clean(formData.get("fazenda_nome"));
  const city = clean(formData.get("city"));
  const state = clean(formData.get("state"))?.toUpperCase().slice(0, 2) ?? null;
  const specie = parseSpecie(formData.get("specie"));
  const corretora_id = clean(formData.get("corretora_id"));

  const missing: string[] = [];
  if (!full_name) missing.push("nome");
  if (!cpf_cnpj) missing.push("CPF/CNPJ");
  if (!whatsapp) missing.push("WhatsApp");
  if (!fazenda_nome) missing.push("fazenda");
  if (!city || !state) missing.push("cidade/UF");

  if (missing.length > 0) {
    redirect(
      `/onboarding/produtor?error=${encodeURIComponent("Preencha: " + missing.join(", "))}`,
    );
  }

  const supabase = await createClient();

  // Atualiza profile: nome, telefone, garante role produtor, vincula corretora se escolheu
  const profilePatch: Record<string, unknown> = {
    full_name,
    phone: whatsapp,
  };
  if (!profile.roles.includes("produtor")) {
    profilePatch.roles = [...profile.roles, "produtor"];
  }
  if (corretora_id) profilePatch.corretora_id = corretora_id;

  const { error: pErr } = await supabase
    .from("profiles")
    .update(profilePatch)
    .eq("id", user.id);
  if (pErr) {
    redirect(
      `/onboarding/produtor?error=${encodeURIComponent(pErr.message)}`,
    );
  }

  // Upsert em produtores
  const { error: prErr } = await supabase.from("produtores").upsert(
    {
      profile_id: user.id,
      fazenda_nome,
      cpf_cnpj,
      whatsapp,
      city,
      state,
      specie,
      status: "ativo",
    },
    { onConflict: "profile_id" },
  );
  if (prErr) {
    redirect(
      `/onboarding/produtor?error=${encodeURIComponent(prErr.message)}`,
    );
  }

  // Favoritar a corretora escolhida (se houver) — produtor consegue ver
  // no diretório como vínculo informal.
  if (corretora_id) {
    await supabase
      .from("favoritos")
      .upsert({ produtor_id: user.id, corretora_id }, {
        onConflict: "produtor_id,corretora_id",
      });
  }

  revalidatePath("/painel/produtor");
  redirect("/painel/produtor?ok=Onboarding%20conclu%C3%ADdo");
}
