"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import type { RegimeTributario } from "./_lib/queries";

const REGIMES: RegimeTributario[] = [
  "simples_nacional",
  "lucro_presumido",
  "lucro_real",
  "mei",
  "isento",
];

function cleanDigits(s: string | null): string | null {
  const v = (s ?? "").replace(/\D/g, "");
  return v || null;
}

function s(v: FormDataEntryValue | null): string | null {
  const t = String(v ?? "").trim();
  return t || null;
}

function regime(v: FormDataEntryValue | null): RegimeTributario | null {
  const t = String(v ?? "").trim();
  return REGIMES.includes(t as RegimeTributario)
    ? (t as RegimeTributario)
    : null;
}

async function ensureCorretora() {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  return profile as typeof profile & { corretora_id: string };
}

function asPayload(formData: FormData) {
  return {
    name: s(formData.get("name")),
    trade_name: s(formData.get("trade_name")),
    cnpj: cleanDigits(s(formData.get("cnpj"))),
    inscricao_estadual: s(formData.get("inscricao_estadual")),
    regime_tributario: regime(formData.get("regime_tributario")),
    contact_name: s(formData.get("contact_name")),
    contact_email: s(formData.get("contact_email")),
    contact_phone: s(formData.get("contact_phone")),
    city: s(formData.get("city")),
    state: s(formData.get("state")),
    tipo: s(formData.get("tipo")),
    observacoes: s(formData.get("observacoes")),
  };
}

export async function createComprador(formData: FormData) {
  const profile = await ensureCorretora();
  const payload = asPayload(formData);
  if (!payload.name) {
    redirect("/painel/corretora/compradores/novo?error=Nome%20obrigat%C3%B3rio");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("compradores").insert({
    corretora_id: profile.corretora_id,
    ...payload,
    name: payload.name,
  });
  if (error) {
    redirect(
      `/painel/corretora/compradores/novo?error=${encodeURIComponent(error.message)}`,
    );
  }
  revalidatePath("/painel/corretora/compradores");
  redirect("/painel/corretora/compradores?ok=Comprador%20criado");
}

export async function updateComprador(formData: FormData) {
  const profile = await ensureCorretora();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const payload = asPayload(formData);
  if (!payload.name) {
    redirect(
      `/painel/corretora/compradores/${id}?error=Nome%20obrigat%C3%B3rio`,
    );
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("compradores")
    .update({ ...payload, name: payload.name })
    .eq("corretora_id", profile.corretora_id)
    .eq("id", id);
  if (error) {
    redirect(
      `/painel/corretora/compradores/${id}?error=${encodeURIComponent(error.message)}`,
    );
  }
  revalidatePath("/painel/corretora/compradores");
  revalidatePath(`/painel/corretora/compradores/${id}`);
  redirect(`/painel/corretora/compradores/${id}?saved=1`);
}

export async function toggleCompradorAtivo(formData: FormData) {
  const profile = await ensureCorretora();
  const id = String(formData.get("id") ?? "");
  const next = formData.get("ativo") === "true";
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("compradores")
    .update({ ativo: next })
    .eq("corretora_id", profile.corretora_id)
    .eq("id", id);
  revalidatePath("/painel/corretora/compradores");
  revalidatePath(`/painel/corretora/compradores/${id}`);
}
