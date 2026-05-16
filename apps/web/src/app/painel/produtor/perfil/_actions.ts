"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getUser } from "@/lib/auth";

function clean(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
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

export async function updatePerfilProdutor(formData: FormData) {
  const user = await getUser();
  if (!user) redirect("/entrar");

  const full_name = clean(formData.get("full_name"));
  const phone = clean(formData.get("phone"));
  const fazenda_nome = clean(formData.get("fazenda_nome"));
  const city = clean(formData.get("city"));
  const state = clean(formData.get("state"));
  const area_ha = parseDecimal(formData.get("area_ha"));
  const altitude_m = parseInteger(formData.get("altitude_m"));

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

  // upsert do produtor estendido
  const { data: existing } = await supabase
    .from("produtores")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error: extErr } = await supabase
      .from("produtores")
      .update({ fazenda_nome, city, state, area_ha, altitude_m })
      .eq("profile_id", user.id);
    if (extErr) {
      redirect(
        `/painel/produtor/perfil?error=${encodeURIComponent(extErr.message)}`,
      );
    }
  } else if (fazenda_nome || city || state || area_ha != null || altitude_m != null) {
    const { error: extErr } = await supabase.from("produtores").insert({
      profile_id: user.id,
      fazenda_nome,
      city,
      state,
      area_ha,
      altitude_m,
    });
    if (extErr) {
      redirect(
        `/painel/produtor/perfil?error=${encodeURIComponent(extErr.message)}`,
      );
    }
  }

  revalidatePath("/painel/produtor/perfil");
  revalidatePath("/painel/produtor");
  redirect("/painel/produtor/perfil?saved=1");
}
