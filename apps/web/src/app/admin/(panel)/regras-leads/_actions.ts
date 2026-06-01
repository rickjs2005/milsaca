"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { getReqLogger } from "@/lib/req-logger";
import { safeError } from "@/lib/logger";

const VALID_ACTIONS = ["match", "skip", "fallback_support"] as const;
type RuleAction = (typeof VALID_ACTIONS)[number];

function parseConditions(raw: string | null): {
  ok: boolean;
  value: object | null;
  error?: string;
} {
  const s = (raw ?? "").trim();
  if (!s) return { ok: true, value: {} };
  try {
    const v = JSON.parse(s) as unknown;
    if (typeof v !== "object" || Array.isArray(v) || v === null) {
      return { ok: false, value: null, error: "Conditions precisa ser um objeto JSON {}." };
    }
    return { ok: true, value: v as object };
  } catch {
    return { ok: false, value: null, error: "JSON inválido em conditions." };
  }
}

function readFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const priorityRaw = String(formData.get("priority") ?? "100").trim();
  const action = String(formData.get("action") ?? "match");
  const conditionsRaw = String(formData.get("conditions") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const active = formData.get("active") === "on";

  const priority = Number.parseInt(priorityRaw, 10);

  const errors: string[] = [];
  if (!name) errors.push("Nome obrigatório.");
  if (!Number.isFinite(priority) || priority < 1 || priority > 9999)
    errors.push("Prioridade entre 1 e 9999.");
  if (!(VALID_ACTIONS as readonly string[]).includes(action))
    errors.push("Ação inválida.");

  const parsed = parseConditions(conditionsRaw);
  if (!parsed.ok) errors.push(parsed.error ?? "Conditions inválido.");

  return {
    errors,
    fields: {
      name,
      priority,
      action: action as RuleAction,
      conditions: parsed.value ?? {},
      notes,
      active,
    },
  };
}

export async function createRule(formData: FormData) {
  const user = await requireAppAdmin();
  const { errors, fields } = readFields(formData);
  if (errors.length > 0) {
    redirect(
      `/admin/regras-leads/nova?error=${encodeURIComponent(errors.join(" "))}`,
    );
  }

  const log = await getReqLogger({ action: "createRule" });
  const supabase = await createClient();
  const { error } = await supabase
    .from("lead_distribution_rules")
    .insert(fields);
  if (error) {
    log.error("lead_rule_insert_falhou", {
      err: safeError(error),
      code: error.code,
    });
    redirect(
      `/admin/regras-leads/nova?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  const { error: auditError } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "create_lead_rule",
    entity: "lead_distribution_rules",
    payload: { name: fields.name, priority: fields.priority, action: fields.action },
  });
  if (auditError) {
    log.warn("audit_insert_falhou", {
      err: safeError(auditError),
      code: auditError.code,
    });
  }

  revalidatePath("/admin/regras-leads");
  redirect("/admin/regras-leads?ok=Regra%20criada");
}

export async function updateRule(formData: FormData) {
  const user = await requireAppAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/regras-leads?error=ID%20inv%C3%A1lido");

  const { errors, fields } = readFields(formData);
  if (errors.length > 0) {
    redirect(
      `/admin/regras-leads/${id}?error=${encodeURIComponent(errors.join(" "))}`,
    );
  }

  const log = await getReqLogger({ action: "updateRule", ruleId: id });
  const supabase = await createClient();
  const { error } = await supabase
    .from("lead_distribution_rules")
    .update(fields)
    .eq("id", id);
  if (error) {
    log.error("lead_rule_update_falhou", {
      err: safeError(error),
      code: error.code,
    });
    redirect(
      `/admin/regras-leads/${id}?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  const { error: auditError } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "update_lead_rule",
    entity: "lead_distribution_rules",
    entity_id: id,
    payload: { name: fields.name, priority: fields.priority, action: fields.action },
  });
  if (auditError) {
    log.warn("audit_insert_falhou", {
      err: safeError(auditError),
      code: auditError.code,
    });
  }

  revalidatePath("/admin/regras-leads");
  redirect(`/admin/regras-leads/${id}?saved=1`);
}

export async function toggleRuleActive(formData: FormData) {
  const user = await requireAppAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const next = formData.get("active") === "true";
  if (!id) redirect("/admin/regras-leads?error=ID%20inv%C3%A1lido");

  const log = await getReqLogger({ action: "toggleRuleActive", ruleId: id });
  const supabase = await createClient();
  const { error } = await supabase
    .from("lead_distribution_rules")
    .update({ active: next })
    .eq("id", id);
  if (error) {
    log.error("lead_rule_update_falhou", {
      err: safeError(error),
      code: error.code,
    });
    redirect(
      `/admin/regras-leads?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  const { error: auditError } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: next ? "activate_lead_rule" : "deactivate_lead_rule",
    entity: "lead_distribution_rules",
    entity_id: id,
    payload: { active: next },
  });
  if (auditError) {
    log.warn("audit_insert_falhou", {
      err: safeError(auditError),
      code: auditError.code,
    });
  }

  revalidatePath("/admin/regras-leads");
  redirect(
    `/admin/regras-leads?ok=Regra%20${next ? "ativada" : "desativada"}`,
  );
}
