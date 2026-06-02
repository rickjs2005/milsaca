"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getUser } from "@/lib/auth";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";

export async function toggleFavorito(formData: FormData) {
  const user = await getUser();
  if (!user) redirect("/entrar");

  const corretoraId = String(formData.get("corretora_id") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();
  if (!corretoraId) redirect("/painel/produtor/corretoras");

  const supabase = await createClient();
  const log = await getReqLogger({
    action: "toggleFavorito",
    corretoraId,
  });

  if (action === "remove") {
    const { error } = await supabase
      .from("favoritos")
      .delete()
      .eq("produtor_id", user.id)
      .eq("corretora_id", corretoraId);
    if (error) {
      log.error("favorito_delete_falhou", { err: safeError(error), code: error.code });
    }
  } else {
    // upsert manual via on-conflict do unique(produtor_id, corretora_id)
    const { error } = await supabase.from("favoritos").insert({
      produtor_id: user.id,
      corretora_id: corretoraId,
    });
    if (error) {
      log.error("favorito_insert_falhou", { err: safeError(error), code: error.code });
    }
  }

  revalidatePath("/painel/produtor/corretoras");
  revalidatePath("/painel/produtor");
}

/**
 * Avalia uma corretora (1-5 estrelas). Upsert por (corretora, produtor).
 * A RLS (`avaliacoes_insert`) garante que só produtor com lead/contrato
 * na corretora consegue gravar — "avaliação verificada".
 */
export async function avaliarCorretora(formData: FormData) {
  const user = await getUser();
  if (!user) redirect("/entrar");

  const corretoraId = String(formData.get("corretora_id") ?? "").trim();
  const rating = Number(formData.get("rating"));
  if (
    !corretoraId ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    redirect("/painel/produtor/corretoras");
  }

  const supabase = await createClient();
  const log = await getReqLogger({ action: "avaliarCorretora", corretoraId });

  const { error } = await supabase.from("corretora_avaliacoes").upsert(
    {
      corretora_id: corretoraId,
      produtor_id: user.id,
      rating,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "corretora_id,produtor_id" },
  );
  if (error) {
    log.error("avaliar_corretora_falhou", {
      err: safeError(error),
      code: error.code,
    });
  }

  await revalidarAposAvaliacao(supabase, corretoraId);
}

/** Remove a avaliação do produtor pra esta corretora. */
export async function removerAvaliacao(formData: FormData) {
  const user = await getUser();
  if (!user) redirect("/entrar");

  const corretoraId = String(formData.get("corretora_id") ?? "").trim();
  if (!corretoraId) redirect("/painel/produtor/corretoras");

  const supabase = await createClient();
  const { error } = await supabase
    .from("corretora_avaliacoes")
    .delete()
    .eq("produtor_id", user.id)
    .eq("corretora_id", corretoraId);
  if (error) {
    const log = await getReqLogger({
      action: "removerAvaliacao",
      corretoraId,
    });
    log.error("remover_avaliacao_falhou", {
      err: safeError(error),
      code: error.code,
    });
  }

  await revalidarAposAvaliacao(supabase, corretoraId);
}

type SupabaseLike = Awaited<ReturnType<typeof createClient>>;

async function revalidarAposAvaliacao(
  supabase: SupabaseLike,
  corretoraId: string,
) {
  revalidatePath("/painel/produtor/corretoras");
  // Reflete a nova média na página pública da corretora.
  const { data: cor } = await supabase
    .from("corretoras_publicas")
    .select("slug")
    .eq("id", corretoraId)
    .maybeSingle();
  if (cor?.slug) revalidatePath(`/c/${cor.slug}`);
}
