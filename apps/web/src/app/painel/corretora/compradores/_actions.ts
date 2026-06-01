"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import {
  compradorSchema,
  flattenZodErrors,
  formDataToObject,
  uuidSchema,
} from "../_lib/schemas";
import { ensureCorretora, requireActiveSubscription } from "../_lib/corretora";
import type { RegimeTributario } from "./_lib/queries";
import type { Json } from "@milsaca/types/database";

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

/**
 * Monta o "Perfil de compra" (matching) a partir do form. Guardado no JSONB
 * `compradores.preferencias` — sem schema novo. Ver `comprador-meta.PerfilCompra`.
 */
function buildPreferencias(formData: FormData): Json {
  const str = (k: string) => {
    const t = String(formData.get(k) ?? "").trim();
    return t || null;
  };
  const volRaw = String(formData.get("perfil_volume_sacas") ?? "").replace(
    /\D+/g,
    "",
  );
  const volume = volRaw ? Number(volRaw) : 0;
  return {
    cafe: str("perfil_cafe"),
    peneira: str("perfil_peneira"),
    processo: str("perfil_processo"),
    volume_sacas: volume > 0 ? volume : null,
    exige_eudr: formData.get("perfil_exige_eudr") != null,
  };
}

export async function createComprador(formData: FormData) {
  const profile = await ensureCorretora();
  await requireActiveSubscription(
    profile.corretora_id,
    "/painel/corretora/compradores",
  );

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
    preferencias: buildPreferencias(formData),
  });
  if (error) {
    const log = await getReqLogger({
      action: "createComprador",
      corretoraId: profile.corretora_id,
    });
    log.error("comprador_insert_falhou", {
      code: error.code,
      err: safeError(error),
    });
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
    .update({
      ...parsed.data,
      regime_tributario,
      preferencias: buildPreferencias(formData),
    })
    .eq("corretora_id", profile.corretora_id)
    .eq("id", id);
  if (error) {
    const log = await getReqLogger({
      action: "updateComprador",
      corretoraId: profile.corretora_id,
      compradorId: id,
    });
    log.error("comprador_update_falhou", {
      code: error.code,
      err: safeError(error),
    });
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
  const { error } = await supabase
    .from("compradores")
    .update({ ativo: next })
    .eq("corretora_id", profile.corretora_id)
    .eq("id", id);
  if (error) {
    const log = await getReqLogger({
      action: "toggleCompradorAtivo",
      corretoraId: profile.corretora_id,
      compradorId: id,
    });
    log.error("comprador_toggle_ativo_falhou", {
      to: next,
      code: error.code,
      err: safeError(error),
    });
  }
  revalidatePath("/painel/corretora/compradores");
  revalidatePath(`/painel/corretora/compradores/${id}`);
}
