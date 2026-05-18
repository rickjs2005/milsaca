"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { requireAppAdmin } from "@/lib/auth";
import { friendlyPostgresError } from "./_lib/errors";
import {
  aprovarCorretoraSchema,
  corretoraSchema,
  flattenZodErrors,
  formDataToObject,
  rejeitarCorretoraSchema,
  uuidSchema,
} from "./_lib/schemas";

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}


export async function createCorretora(formData: FormData) {
  const actor = await requireAppAdmin();

  const parsed = corretoraSchema.safeParse(
    formDataToObject(formData, ["regioes_atendimento"]),
  );
  if (!parsed.success) {
    redirect(
      `/admin/corretoras/nova?error=${encodeURIComponent(flattenZodErrors(parsed.error))}`,
    );
  }
  const fields = parsed.data;

  const slugInput = String(formData.get("slug") ?? "").trim();
  const verified = formData.get("verified") === "on";

  const slug = slugify(slugInput || fields.name);
  if (!slug) {
    redirect(
      `/admin/corretoras/nova?error=${encodeURIComponent("Não consegui gerar slug a partir do nome.")}`,
    );
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("corretoras")
    .insert({ ...fields, slug, verified })
    .select("id")
    .single();

  if (error || !created) {
    redirect(
      `/admin/corretoras/nova?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  await supabase.from("audit_log").insert({
    actor_id: actor.id,
    corretora_id: created.id,
    action: "create_corretora",
    entity: "corretora",
    entity_id: created.id,
    payload: { name: fields.name, slug, cnpj: fields.cnpj, verified },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/corretoras");
  redirect("/admin/corretoras?ok=Corretora%20criada");
}

export async function updateCorretora(formData: FormData) {
  const actor = await requireAppAdmin();

  const idParsed = uuidSchema.safeParse(String(formData.get("id") ?? "").trim());
  if (!idParsed.success) redirect("/admin/corretoras");
  const id = idParsed.data;

  const parsed = corretoraSchema.safeParse(
    formDataToObject(formData, ["regioes_atendimento"]),
  );
  if (!parsed.success) {
    redirect(
      `/admin/corretoras/${id}?error=${encodeURIComponent(flattenZodErrors(parsed.error))}`,
    );
  }
  const fields = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("corretoras")
    .update(fields)
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/corretoras/${id}?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  await supabase.from("audit_log").insert({
    actor_id: actor.id,
    corretora_id: id,
    action: "update_corretora",
    entity: "corretora",
    entity_id: id,
    payload: {
      fields: Object.keys(fields).filter(
        (k) => (fields as Record<string, unknown>)[k] != null,
      ),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/corretoras");
  revalidatePath(`/admin/corretoras/${id}`);
  redirect(`/admin/corretoras/${id}?saved=1`);
}

export async function toggleCorretoraVerified(formData: FormData) {
  const actor = await requireAppAdmin();
  const id = String(formData.get("id") ?? "");
  const next = formData.get("verified") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("corretoras").update({ verified: next }).eq("id", id);

  await supabase.from("audit_log").insert({
    actor_id: actor.id,
    corretora_id: id,
    action: next ? "verify_corretora" : "unverify_corretora",
    entity: "corretora",
    entity_id: id,
    payload: { verified: next },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/corretoras");
}

export async function aprovarCorretora(formData: FormData) {
  const actor = await requireAppAdmin();

  const parsed = aprovarCorretoraSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    redirect(
      `/admin/aprovacoes?error=${encodeURIComponent(flattenZodErrors(parsed.error))}`,
    );
  }
  const { profile_id: profileId, name, cnpj, city, state } = parsed.data;

  const slug = slugify(name);
  if (!slug) {
    redirect(
      `/admin/aprovacoes?error=${encodeURIComponent("Não consegui gerar slug a partir do nome.")}`,
    );
  }

  const supabase = await createClient();

  const { data: created, error: createErr } = await supabase
    .from("corretoras")
    .insert({
      name,
      slug,
      cnpj,
      city,
      state,
      verified: true,
    })
    .select("id")
    .single();

  if (createErr || !created) {
    redirect(
      `/admin/aprovacoes?error=${encodeURIComponent(friendlyPostgresError(createErr))}`,
    );
  }

  const { error: linkErr } = await supabase
    .from("profiles")
    .update({ corretora_id: created.id, status: "ativo" })
    .eq("id", profileId);

  if (linkErr) {
    redirect(
      `/admin/aprovacoes?error=${encodeURIComponent(friendlyPostgresError(linkErr))}`,
    );
  }

  // Trial de 30 dias automático. Admin pode trocar/cobrar depois em
  // /admin/assinaturas/[id]. Falha silenciosa (loga em audit) — não
  // bloqueia a aprovação.
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 30);
  const { error: subErr } = await supabase.from("subscriptions").insert({
    corretora_id: created.id,
    status: "trial",
    started_at: new Date().toISOString(),
    trial_ends_at: trialEnds.toISOString(),
  });

  await supabase.from("audit_log").insert({
    actor_id: actor.id,
    corretora_id: created.id,
    action: "aprovar_corretora",
    entity: "profile",
    entity_id: profileId,
    payload: {
      name,
      cnpj,
      city,
      state,
      trial_ends_at: trialEnds.toISOString(),
      subscription_error: subErr?.message ?? null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/aprovacoes");
  revalidatePath("/admin/corretoras");
  redirect(
    "/admin/aprovacoes?ok=" +
      encodeURIComponent(`${name} aprovada e ativada.`),
  );
}

export async function rejeitarCorretora(formData: FormData) {
  const actor = await requireAppAdmin();

  const parsed = rejeitarCorretoraSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) redirect("/admin/aprovacoes");
  const { profile_id: profileId } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ status: "bloqueado" })
    .eq("id", profileId);

  if (error) {
    redirect(
      `/admin/aprovacoes?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  await supabase.from("audit_log").insert({
    actor_id: actor.id,
    action: "rejeitar_corretora",
    entity: "profile",
    entity_id: profileId,
    payload: {},
  });

  revalidatePath("/admin");
  revalidatePath("/admin/aprovacoes");
  redirect(
    "/admin/aprovacoes?ok=" +
      encodeURIComponent("Solicitação rejeitada."),
  );
}

export async function linkProfileToCorretora(formData: FormData) {
  const actor = await requireAppAdmin();
  const profileId = String(formData.get("profile_id") ?? "");
  const corretoraId = String(formData.get("corretora_id") ?? "");
  if (!profileId) return;

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({
      corretora_id: corretoraId || null,
    })
    .eq("id", profileId);

  await supabase.from("audit_log").insert({
    actor_id: actor.id,
    corretora_id: corretoraId || null,
    action: corretoraId ? "link_profile_corretora" : "unlink_profile_corretora",
    entity: "profile",
    entity_id: profileId,
    payload: { corretora_id: corretoraId || null },
  });

  revalidatePath("/admin");
}
