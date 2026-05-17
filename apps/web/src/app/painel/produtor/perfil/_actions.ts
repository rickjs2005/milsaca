"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getUser } from "@/lib/auth";
import type {
  CanalPreferido,
  ProdutorSpecie,
} from "../_lib/produtor";

const VALID_SPECIE: ProdutorSpecie[] = ["arabica", "conilon", "ambos"];
const VALID_CANAL: CanalPreferido[] = ["app", "whatsapp", "email", "sms"];

function clean(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function cleanDigits(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").replace(/\D/g, "");
  return s || null;
}

function parseDecimal(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseInteger(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseSpecie(v: FormDataEntryValue | null): ProdutorSpecie | null {
  const s = String(v ?? "").trim();
  return VALID_SPECIE.includes(s as ProdutorSpecie)
    ? (s as ProdutorSpecie)
    : null;
}

function parseCanal(v: FormDataEntryValue | null): CanalPreferido | null {
  const s = String(v ?? "").trim();
  return VALID_CANAL.includes(s as CanalPreferido)
    ? (s as CanalPreferido)
    : null;
}

function parseList(v: FormDataEntryValue | null): string[] {
  return String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function updatePerfilProdutor(formData: FormData) {
  const user = await getUser();
  if (!user) redirect("/entrar");

  const full_name = clean(formData.get("full_name"));
  const phone = clean(formData.get("phone"));

  if (!full_name) {
    redirect(
      "/painel/produtor/perfil?error=" +
        encodeURIComponent("Nome obrigatório"),
    );
  }

  const supabase = await createClient();

  const { error: pErr } = await supabase
    .from("profiles")
    .update({ full_name, phone })
    .eq("id", user.id);

  if (pErr) {
    redirect(
      `/painel/produtor/perfil?error=${encodeURIComponent(pErr.message)}`,
    );
  }

  // Upsert produtor estendido com todos os campos novos
  const payload = {
    profile_id: user.id,
    whatsapp: clean(formData.get("whatsapp")),
    cpf_cnpj: cleanDigits(formData.get("cpf_cnpj")),
    caepf: clean(formData.get("caepf")),
    fazenda_nome: clean(formData.get("fazenda_nome")),
    city: clean(formData.get("city")),
    state: clean(formData.get("state"))?.toUpperCase().slice(0, 2) ?? null,
    area_ha: parseDecimal(formData.get("area_ha")),
    altitude_m: parseInteger(formData.get("altitude_m")),
    specie: parseSpecie(formData.get("specie")),
    car: clean(formData.get("car")),
    indicacao_geografica: clean(formData.get("indicacao_geografica")),
    variedades: parseList(formData.get("variedades")),
    certificacoes: parseList(formData.get("certificacoes")),
    preco_alvo: parseDecimal(formData.get("preco_alvo")),
    canal_preferido: parseCanal(formData.get("canal_preferido")),
    receber_cotacao_diaria: formData.get("receber_cotacao_diaria") === "on",
  };

  const { error: extErr } = await supabase
    .from("produtores")
    .upsert(payload, { onConflict: "profile_id" });
  if (extErr) {
    redirect(
      `/painel/produtor/perfil?error=${encodeURIComponent(extErr.message)}`,
    );
  }

  revalidatePath("/painel/produtor/perfil");
  revalidatePath("/painel/produtor");
  redirect("/painel/produtor/perfil?saved=1");
}
