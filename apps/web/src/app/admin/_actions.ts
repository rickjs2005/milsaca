"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { requireAppAdmin } from "@/lib/auth";

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function clean(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function readCorretoraForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    city: clean(formData.get("city")),
    state: clean(formData.get("state")),
    phone: clean(formData.get("phone")),
    telefone_fixo: clean(formData.get("telefone_fixo")),
    email: clean(formData.get("email")),
    cnpj: clean(formData.get("cnpj")),
    inscricao_est: clean(formData.get("inscricao_est")),
    cep: clean(formData.get("cep")),
    endereco: clean(formData.get("endereco")),
    bairro: clean(formData.get("bairro")),
    site_url: clean(formData.get("site_url")),
    descricao: clean(formData.get("descricao")),
    logo_url: clean(formData.get("logo_url")),
  };
}

export async function createCorretora(formData: FormData) {
  const actor = await requireAppAdmin();
  const fields = readCorretoraForm(formData);
  const slugInput = String(formData.get("slug") ?? "").trim();
  const verified = formData.get("verified") === "on";

  if (!fields.name) {
    redirect("/admin/corretoras/nova?error=Nome%20obrigat%C3%B3rio");
  }

  const slug = slugify(slugInput || fields.name);
  if (!slug) {
    redirect("/admin/corretoras/nova?error=Slug%20inv%C3%A1lido");
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("corretoras")
    .insert({ ...fields, slug, verified })
    .select("id")
    .single();

  if (error || !created) {
    redirect(
      `/admin/corretoras/nova?error=${encodeURIComponent(error?.message ?? "Falha ao criar")}`,
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
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/corretoras");

  const fields = readCorretoraForm(formData);
  if (!fields.name) {
    redirect(`/admin/corretoras/${id}?error=Nome%20obrigat%C3%B3rio`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("corretoras")
    .update(fields)
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/corretoras/${id}?error=${encodeURIComponent(error.message)}`,
    );
  }

  await supabase.from("audit_log").insert({
    actor_id: actor.id,
    corretora_id: id,
    action: "update_corretora",
    entity: "corretora",
    entity_id: id,
    payload: { fields: Object.keys(fields).filter((k) => (fields as Record<string, unknown>)[k] != null) },
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

function cleanDigits(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").replace(/\D/g, "");
  return s || null;
}

export async function aprovarCorretora(formData: FormData) {
  const actor = await requireAppAdmin();
  const profileId = String(formData.get("profile_id") ?? "").trim();
  if (!profileId) {
    redirect("/admin/aprovacoes?error=" + encodeURIComponent("Profile inválido"));
  }

  const name = String(formData.get("name") ?? "").trim();
  const cnpj = cleanDigits(formData.get("cnpj"));
  const city = clean(formData.get("city"));
  const state = clean(formData.get("state"));

  const missing: string[] = [];
  if (!name) missing.push("nome");
  if (!cnpj) missing.push("CNPJ");
  if (!city) missing.push("cidade");
  if (missing.length > 0) {
    redirect(
      "/admin/aprovacoes?error=" +
        encodeURIComponent("Preencha: " + missing.join(", ")),
    );
  }

  const slug = slugify(name);
  if (!slug) {
    redirect(
      "/admin/aprovacoes?error=" + encodeURIComponent("Não consegui gerar slug"),
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
      state: state ? state.toUpperCase().slice(0, 2) : null,
      verified: true,
    })
    .select("id")
    .single();

  if (createErr || !created) {
    redirect(
      "/admin/aprovacoes?error=" +
        encodeURIComponent(createErr?.message ?? "Falha ao criar corretora"),
    );
  }

  const { error: linkErr } = await supabase
    .from("profiles")
    .update({ corretora_id: created.id, status: "ativo" })
    .eq("id", profileId);

  if (linkErr) {
    redirect(
      "/admin/aprovacoes?error=" + encodeURIComponent(linkErr.message),
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
  const profileId = String(formData.get("profile_id") ?? "").trim();
  if (!profileId) {
    redirect("/admin/aprovacoes");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ status: "bloqueado" })
    .eq("id", profileId);

  if (error) {
    redirect(
      "/admin/aprovacoes?error=" + encodeURIComponent(error.message),
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
