"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getProfile, requireUser } from "@/lib/auth";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import {
  cityOptionalSchema,
  cpfOrCnpjOptionalSchema,
  ufOptionalSchema,
  whatsappSchema,
} from "@/lib/brasil-schemas";
import type { ProdutorSpecie } from "@/app/painel/produtor/_lib/produtor";

const VALID_SPECIE: ProdutorSpecie[] = ["arabica", "conilon", "ambos"];

function clean(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

function parseSpecie(v: FormDataEntryValue | null): ProdutorSpecie | null {
  const s = String(v ?? "").trim();
  return VALID_SPECIE.includes(s as ProdutorSpecie)
    ? (s as ProdutorSpecie)
    : null;
}

function redirectError(msg: string): never {
  redirect(`/onboarding/produtor?error=${encodeURIComponent(msg)}`);
}

export async function completarOnboarding(formData: FormData) {
  const user = await requireUser("/onboarding/produtor");
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  const full_name = clean(formData.get("full_name"));
  const whatsappRaw = String(formData.get("whatsapp") ?? "");
  const fazenda_nome = clean(formData.get("fazenda_nome"));
  const specie = parseSpecie(formData.get("specie"));
  const corretora_id = clean(formData.get("corretora_id"));

  if (!full_name) redirectError("Preencha seu nome.");

  // WhatsApp é o único contato obrigatório (é por ele que a corretora fala).
  const whatsappParsed = whatsappSchema.safeParse(whatsappRaw);
  if (!whatsappParsed.success)
    redirectError("Informe um WhatsApp válido com DDD.");
  const whatsapp = whatsappParsed.data;

  // CPF/CNPJ, UF e cidade são OPCIONAIS — completa depois no Perfil.
  // Se vier preenchido, valida; se vier vazio, segue como null.
  const cpfParsed = cpfOrCnpjOptionalSchema.safeParse(formData.get("cpf_cnpj"));
  if (!cpfParsed.success)
    redirectError("CPF ou CNPJ inválido — confira ou deixe em branco.");
  const cpf_cnpj = cpfParsed.data;

  const cityParsed = cityOptionalSchema.safeParse(formData.get("city"));
  if (!cityParsed.success) redirectError("Cidade inválida.");
  const city = cityParsed.data;

  const stateParsed = ufOptionalSchema.safeParse(formData.get("state"));
  if (!stateParsed.success) redirectError("Estado inválido.");
  const state = stateParsed.data;

  const supabase = await createClient();
  const log = await getReqLogger({ action: "completarOnboarding" });

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
    log.error("profile_update_falhou", { err: safeError(pErr), code: pErr.code });
    redirectError(pErr.message);
  }

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
    log.error("produtor_upsert_falhou", { err: safeError(prErr), code: prErr.code });
    redirectError(prErr.message);
  }

  if (corretora_id) {
    const { error: favErr } = await supabase
      .from("favoritos")
      .upsert({ produtor_id: user.id, corretora_id }, {
        onConflict: "produtor_id,corretora_id",
      });
    if (favErr) {
      log.warn("favorito_upsert_falhou", { err: safeError(favErr), code: favErr.code });
    }
  }

  revalidatePath("/painel/produtor");
  redirect("/painel/produtor?ok=Onboarding%20conclu%C3%ADdo");
}
