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

export async function gerarConviteCorretora(formData: FormData) {
  const actor = await requireAppAdmin();

  const corretoraIdParsed = uuidSchema.safeParse(
    String(formData.get("corretora_id") ?? "").trim(),
  );
  if (!corretoraIdParsed.success) redirect("/admin/corretoras");
  const corretoraId = corretoraIdParsed.data;

  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;

  const supabase = await createClient();
  const { data: invite, error } = await supabase
    .from("corretora_invites")
    .insert({
      corretora_id: corretoraId,
      email,
      created_by: actor.id,
    })
    .select("token, expires_at")
    .single();

  if (error || !invite) {
    redirect(
      `/admin/corretoras/${corretoraId}?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  await supabase.from("audit_log").insert({
    actor_id: actor.id,
    corretora_id: corretoraId,
    action: "create_corretora_invite",
    entity: "corretora_invite",
    entity_id: invite.token,
    payload: { email, expires_at: invite.expires_at },
  });

  revalidatePath(`/admin/corretoras/${corretoraId}`);
  redirect(`/admin/corretoras/${corretoraId}?invite_token=${invite.token}`);
}

export async function revogarConviteCorretora(formData: FormData) {
  const actor = await requireAppAdmin();

  const tokenParsed = uuidSchema.safeParse(
    String(formData.get("token") ?? "").trim(),
  );
  const corretoraIdParsed = uuidSchema.safeParse(
    String(formData.get("corretora_id") ?? "").trim(),
  );
  if (!tokenParsed.success || !corretoraIdParsed.success) {
    redirect("/admin/corretoras");
  }
  const token = tokenParsed.data;
  const corretoraId = corretoraIdParsed.data;

  const supabase = await createClient();
  // Marcar como expirado em vez de deletar pra manter audit trail.
  await supabase
    .from("corretora_invites")
    .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
    .eq("token", token)
    .is("used_at", null);

  await supabase.from("audit_log").insert({
    actor_id: actor.id,
    corretora_id: corretoraId,
    action: "revoke_corretora_invite",
    entity: "corretora_invite",
    entity_id: token,
    payload: {},
  });

  revalidatePath(`/admin/corretoras/${corretoraId}`);
  redirect(`/admin/corretoras/${corretoraId}?ok=Convite%20revogado`);
}

export async function toggleCorretoraVerified(formData: FormData) {
  const actor = await requireAppAdmin();

  const idParsed = uuidSchema.safeParse(String(formData.get("id") ?? "").trim());
  if (!idParsed.success) return;
  const id = idParsed.data;
  const next = formData.get("verified") === "true";

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

/**
 * Libera (ou rebaixa) uma corretora pra um tier — atalho admin pra
 * deixar a corretora usando todas as features do Pro/Premium sem
 * precisar passar por /admin/assinaturas.
 *
 * Self-healing: se o plano (corretora-pro/corretora-premium) não
 * existir no banco, é criado na hora com features compatíveis com o
 * catálogo da Fase 8 (assinatura/_lib/plans-catalog).
 *
 * Upsert na subscription da corretora — 1-pra-1 garantido por unique.
 * Period_end vai pra +1 ano (ou +100 anos pro Premium "vitalício"
 * usado em corretoras parceiras/teste).
 *
 * Tier 'gratuito' cancela a subscription existente (status=canceled)
 * — fica em modo read-only no painel; nada é deletado.
 */
const TIER_PLANS: Record<
  "pro" | "premium",
  { slug: string; name: string; description: string; price_cents: number }
> = {
  pro: {
    slug: "corretora-pro",
    name: "Corretora Pro",
    description: "Operação comercial completa",
    price_cents: 29900,
  },
  premium: {
    slug: "corretora-premium",
    name: "Corretora Premium",
    description: "Multi-operador + relatórios + API",
    price_cents: 0, // sob consulta — admin define depois
  },
};

export async function grantCorretoraTier(formData: FormData) {
  const actor = await requireAppAdmin();

  const corretoraIdParsed = uuidSchema.safeParse(
    String(formData.get("corretora_id") ?? "").trim(),
  );
  if (!corretoraIdParsed.success) return;
  const corretoraId = corretoraIdParsed.data;

  const tier = String(formData.get("tier") ?? "").trim();
  if (tier !== "gratuito" && tier !== "pro" && tier !== "premium") {
    redirect(
      `/admin/corretoras/${corretoraId}?error=${encodeURIComponent("Tier inválido")}`,
    );
  }

  const supabase = await createClient();

  if (tier === "gratuito") {
    // Cancela subscription existente. Painel da corretora cai pra Free
    // automaticamente (detectCurrentTier resolve "none" como Gratuito).
    await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        canceled_at: new Date().toISOString(),
      })
      .eq("corretora_id", corretoraId);

    await supabase.from("audit_log").insert({
      actor_id: actor.id,
      corretora_id: corretoraId,
      action: "grant_tier_gratuito",
      entity: "subscription",
      entity_id: corretoraId,
      payload: { tier: "gratuito" },
    });

    revalidatePath("/admin/corretoras");
    revalidatePath(`/admin/corretoras/${corretoraId}`);
    redirect(
      `/admin/corretoras/${corretoraId}?saved=${encodeURIComponent("Corretora rebaixada pra Gratuito")}`,
    );
  }

  const planMeta = TIER_PLANS[tier as "pro" | "premium"];

  // Self-heal: garante que o plano existe (upsert por slug)
  const { data: existingPlan } = await supabase
    .from("plans")
    .select("id")
    .eq("slug", planMeta.slug)
    .maybeSingle<{ id: string }>();

  let planId = existingPlan?.id;
  if (!planId) {
    const { data: created, error: planErr } = await supabase
      .from("plans")
      .insert({
        slug: planMeta.slug,
        name: planMeta.name,
        description: planMeta.description,
        price_cents: planMeta.price_cents,
        billing_period: "monthly",
        features: [],
        active: true,
      })
      .select("id")
      .single<{ id: string }>();
    if (planErr || !created) {
      redirect(
        `/admin/corretoras/${corretoraId}?error=${encodeURIComponent(friendlyPostgresError(planErr ?? null))}`,
      );
    }
    planId = created.id;
  }

  // Period end: Premium = 100 anos (parceiro vitalício), Pro = 1 ano
  const now = new Date();
  const periodEnd = new Date(now);
  if (tier === "premium") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 100);
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  // Upsert da subscription. Schema tem corretora_id UNIQUE, então
  // onConflict resolve em update — sem race condition.
  const { error: subErr } = await supabase
    .from("subscriptions")
    .upsert(
      {
        corretora_id: corretoraId,
        plan_id: planId,
        status: "active",
        started_at: now.toISOString(),
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        canceled_at: null,
        trial_ends_at: null,
      },
      { onConflict: "corretora_id" },
    );

  if (subErr) {
    redirect(
      `/admin/corretoras/${corretoraId}?error=${encodeURIComponent(friendlyPostgresError(subErr))}`,
    );
  }

  await supabase.from("audit_log").insert({
    actor_id: actor.id,
    corretora_id: corretoraId,
    action: `grant_tier_${tier}`,
    entity: "subscription",
    entity_id: corretoraId,
    payload: { tier, plan_id: planId, period_end: periodEnd.toISOString() },
  });

  revalidatePath("/admin/corretoras");
  revalidatePath(`/admin/corretoras/${corretoraId}`);
  revalidatePath("/admin/assinaturas");
  const label = tier === "premium" ? "Premium (vitalício)" : "Pro (+1 ano)";
  redirect(
    `/admin/corretoras/${corretoraId}?saved=${encodeURIComponent(`Liberado plano ${label}`)}`,
  );
}

export async function linkProfileToCorretora(formData: FormData) {
  const actor = await requireAppAdmin();

  const profileParsed = uuidSchema.safeParse(
    String(formData.get("profile_id") ?? "").trim(),
  );
  if (!profileParsed.success) return;
  const profileId = profileParsed.data;

  // corretora_id é opcional: vazio significa "desvincular"
  const rawCorretora = String(formData.get("corretora_id") ?? "").trim();
  let corretoraId: string | null = null;
  if (rawCorretora) {
    const corretoraParsed = uuidSchema.safeParse(rawCorretora);
    if (!corretoraParsed.success) return;
    corretoraId = corretoraParsed.data;
  }

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({
      corretora_id: corretoraId,
    })
    .eq("id", profileId);

  await supabase.from("audit_log").insert({
    actor_id: actor.id,
    corretora_id: corretoraId,
    action: corretoraId ? "link_profile_corretora" : "unlink_profile_corretora",
    entity: "profile",
    entity_id: profileId,
    payload: { corretora_id: corretoraId },
  });

  revalidatePath("/admin");
}
