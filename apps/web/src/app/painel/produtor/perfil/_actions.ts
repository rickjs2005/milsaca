"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getUser } from "@/lib/auth";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import {
  cityOptionalSchema,
  cpfOrCnpjOptionalSchema,
  phoneBROptionalSchema,
  ufOptionalSchema,
} from "@/lib/brasil-schemas";
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

function redirectError(msg: string): never {
  redirect(`/painel/produtor/perfil?error=${encodeURIComponent(msg)}`);
}

/**
 * Normaliza um campo brasileiro opcional via schema Zod, devolvendo:
 *  - valor normalizado (digits-only / E.164 sem +, etc) quando válido
 *  - null quando vazio
 *  - redirect com mensagem quando preenchido mas inválido
 */
function parseBrField<T>(
  schema: { safeParse(v: unknown): { success: boolean; data?: T } },
  raw: FormDataEntryValue | null,
  invalidMsg: string,
): T | null {
  const r = schema.safeParse(String(raw ?? ""));
  if (!r.success) redirectError(invalidMsg);
  return (r.data as T | null) ?? null;
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
  if (!full_name) redirectError("Nome obrigatório");

  const phone = parseBrField<string | null>(
    phoneBROptionalSchema,
    formData.get("phone"),
    "Telefone inválido. Use formato com DDD.",
  );
  const whatsapp = parseBrField<string | null>(
    phoneBROptionalSchema,
    formData.get("whatsapp"),
    "WhatsApp inválido. Use formato com DDD.",
  );
  const cpf_cnpj = parseBrField<string | null>(
    cpfOrCnpjOptionalSchema,
    formData.get("cpf_cnpj"),
    "CPF/CNPJ inválido.",
  );
  const city = parseBrField<string | null>(
    cityOptionalSchema,
    formData.get("city"),
    "Cidade inválida.",
  );
  const state = parseBrField<string | null>(
    ufOptionalSchema,
    formData.get("state"),
    "UF inválida.",
  );

  const supabase = await createClient();
  const log = await getReqLogger({ action: "updatePerfilProdutor" });

  const { error: pErr } = await supabase
    .from("profiles")
    .update({ full_name, phone })
    .eq("id", user.id);

  if (pErr) {
    log.error("profile_update_falhou", { err: safeError(pErr), code: pErr.code });
    redirectError(pErr.message);
  }

  // Upsert produtor estendido com todos os campos novos
  const payload = {
    profile_id: user.id,
    whatsapp,
    cpf_cnpj,
    caepf: clean(formData.get("caepf")),
    fazenda_nome: clean(formData.get("fazenda_nome")),
    city,
    state,
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
    log.error("produtor_upsert_falhou", { err: safeError(extErr), code: extErr.code });
    redirectError(extErr.message);
  }

  revalidatePath("/painel/produtor/perfil");
  revalidatePath("/painel/produtor");
  redirect("/painel/produtor/perfil?saved=1");
}
