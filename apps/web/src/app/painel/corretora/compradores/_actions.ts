"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import { friendlyPostgresError } from "@/lib/postgres-error";
import {
  compradorSchema,
  flattenZodErrors,
  formDataToObject,
  uuidSchema,
} from "../_lib/schemas";
import type { RegimeTributario } from "./_lib/queries";

const REGIMES: RegimeTributario[] = [
  "simples_nacional",
  "lucro_presumido",
  "lucro_real",
  "mei",
  "isento",
];

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

export async function createComprador(formData: FormData) {
  const profile = await ensureCorretora();

  const parsed = compradorSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    redirect(
      `/painel/corretora/compradores/novo?error=${encodeURIComponent(flattenZodErrors(parsed.error))}`,
    );
  }

  // Campo regime_tributario tem enum próprio (Postgres) — não está no Zod
  // genérico; lemos separado.
  const regime_tributario = regime(formData.get("regime_tributario"));

  const supabase = await createClient();
  const { error } = await supabase.from("compradores").insert({
    corretora_id: profile.corretora_id,
    ...parsed.data,
    regime_tributario,
  });
  if (error) {
    redirect(
      `/painel/corretora/compradores/novo?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }
  revalidatePath("/painel/corretora/compradores");
  redirect("/painel/corretora/compradores?ok=Comprador%20criado");
}

export async function updateComprador(formData: FormData) {
  const profile = await ensureCorretora();

  const idParsed = uuidSchema.safeParse(String(formData.get("id") ?? ""));
  if (!idParsed.success) return;
  const id = idParsed.data;

  const parsed = compradorSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    redirect(
      `/painel/corretora/compradores/${id}?error=${encodeURIComponent(flattenZodErrors(parsed.error))}`,
    );
  }
  const regime_tributario = regime(formData.get("regime_tributario"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("compradores")
    .update({ ...parsed.data, regime_tributario })
    .eq("corretora_id", profile.corretora_id)
    .eq("id", id);
  if (error) {
    redirect(
      `/painel/corretora/compradores/${id}?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }
  revalidatePath("/painel/corretora/compradores");
  revalidatePath(`/painel/corretora/compradores/${id}`);
  redirect(`/painel/corretora/compradores/${id}?saved=1`);
}

export async function toggleCompradorAtivo(formData: FormData) {
  const profile = await ensureCorretora();
  const idParsed = uuidSchema.safeParse(String(formData.get("id") ?? ""));
  if (!idParsed.success) return;
  const id = idParsed.data;
  const next = formData.get("ativo") === "true";

  const supabase = await createClient();
  await supabase
    .from("compradores")
    .update({ ativo: next })
    .eq("corretora_id", profile.corretora_id)
    .eq("id", id);
  revalidatePath("/painel/corretora/compradores");
  revalidatePath(`/painel/corretora/compradores/${id}`);
}
