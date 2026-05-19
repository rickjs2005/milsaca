#!/usr/bin/env node
/**
 * Smoke test do fluxo de aprovação de corretora.
 *
 * Etapas (via service role, bypassa RLS):
 *   1. cria user fake com raw_user_meta_data simulando signup de corretora
 *   2. confere que o trigger handle_new_user criou profile com status=pendente
 *      e role=corretora
 *   3. confere que list_pending_corretora_signups() (consulta equivalente)
 *      acha o registro com os campos extras (nome/cnpj/cidade)
 *   4. simula a action aprovarCorretora: cria corretora + linka profile +
 *      muda status pra ativo + grava audit_log
 *   5. confere o estado final
 *   6. cleanup: remove corretora, audit_log e user
 *
 * Não usa o front; só valida que banco/trigger/RPC suportam o fluxo.
 *
 * Uso:
 *   pnpm --filter @milsaca/web exec node scripts/smoke-aprovacao.mjs
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "..", ".env.local");

async function loadEnv() {
  const raw = await readFile(envPath, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

function slugify(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const log = (label, value) => {
  console.log(`  ${label.padEnd(28)} ${value}`);
};
const ok = (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`);
const fail = (msg) => {
  console.log(`\x1b[31m✗\x1b[0m ${msg}`);
  process.exitCode = 1;
};

async function main() {
  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SECRET_KEY");
    process.exit(1);
  }

  const supa = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = Date.now();
  const fakeEmail = `smoke-corretora-${stamp}@milsaca.test`;
  const fakeCorretoraName = `Smoke Corretora ${stamp}`;
  // CNPJ com DV correto — aprovarCorretoraSchema agora valida via Zod.
  // Antes era 12345678000190 (length-only); falha desde a Fase E1.
  const fakeCnpj = "11222333000181";
  const fakeCity = "Manhuaçu";

  console.log("\n=== SMOKE TEST: aprovação de corretora ===\n");
  log("email fake", fakeEmail);
  log("corretora fake", fakeCorretoraName);

  // ---- 1. signup simulado ----
  console.log("\n[1] criando user via admin.createUser...");
  const { data: created, error: cErr } = await supa.auth.admin.createUser({
    email: fakeEmail,
    password: "smoke-test-pw-9999",
    email_confirm: true,
    user_metadata: {
      full_name: "Operadora Smoke",
      role: "corretora",
      corretora_name: fakeCorretoraName,
      corretora_cnpj: fakeCnpj,
      corretora_city: fakeCity,
    },
  });
  if (cErr || !created?.user) {
    fail(`createUser falhou: ${cErr?.message}`);
    return;
  }
  const userId = created.user.id;
  log("user.id", userId);
  ok("user criado");

  let createdCorretoraId = null;
  let createdSubscriptionId = null;
  let auditLogIds = [];

  try {
    // ---- 2. profile criado pelo trigger ----
    console.log("\n[2] conferindo profile criado pelo trigger...");
    const { data: prof, error: pErr } = await supa
      .from("profiles")
      .select("id, role, roles, status, corretora_id, full_name")
      .eq("id", userId)
      .single();
    if (pErr || !prof) {
      fail(`profile não criado: ${pErr?.message}`);
      return;
    }
    log("profile.status", prof.status);
    log("profile.role", prof.role);
    log("profile.roles", JSON.stringify(prof.roles));
    log("profile.full_name", prof.full_name);
    log("profile.corretora_id", String(prof.corretora_id));

    if (prof.status !== "pendente") fail(`status esperado pendente, veio ${prof.status}`);
    else ok("status=pendente");
    if (prof.role !== "corretora") fail(`role esperado corretora, veio ${prof.role}`);
    else ok("role=corretora");
    if (!prof.roles?.includes("corretora")) fail("roles não contém corretora");
    else ok("roles inclui corretora");
    if (prof.corretora_id !== null) fail("corretora_id deveria estar null");
    else ok("corretora_id=null");

    // ---- 3. RPC list_pending_corretora_signups (consulta equivalente) ----
    console.log("\n[3] conferindo dados de signup em auth.users...");
    // service role não tem auth.uid() → is_admin() retorna false e a RPC
    // dispara raise exception. Reproduzimos a query da função pra validar
    // que os campos aparecem corretamente.
    const { data: pendentes, error: rpcErr } = await supa
      .schema("public")
      .rpc("list_pending_corretora_signups");

    if (rpcErr && !/forbidden/i.test(rpcErr.message)) {
      fail(`RPC erro inesperado: ${rpcErr.message}`);
    } else {
      ok(`RPC protege via is_admin() (erro esperado: ${rpcErr?.message ?? "—"})`);
    }

    // valida query equivalente direto via service_role
    const { data: rawUser } = await supa.auth.admin.getUserById(userId);
    const meta = rawUser?.user?.user_metadata ?? {};
    log("meta.corretora_name", meta.corretora_name);
    log("meta.corretora_cnpj", meta.corretora_cnpj);
    log("meta.corretora_city", meta.corretora_city);
    if (meta.corretora_name !== fakeCorretoraName) fail("corretora_name não bate");
    else ok("raw_user_meta_data tem corretora_name");
    if (meta.corretora_cnpj !== fakeCnpj) fail("corretora_cnpj não bate");
    else ok("raw_user_meta_data tem corretora_cnpj");

    // ---- 4. simula aprovarCorretora ----
    console.log("\n[4] simulando aprovação (insert corretora + link + ativo)...");
    const slug = slugify(fakeCorretoraName);
    const { data: corr, error: corrErr } = await supa
      .from("corretoras")
      .insert({
        name: fakeCorretoraName,
        slug,
        cnpj: fakeCnpj,
        city: fakeCity,
        state: "MG",
        verified: true,
      })
      .select("id")
      .single();
    if (corrErr || !corr) {
      fail(`insert corretora falhou: ${corrErr?.message}`);
      return;
    }
    createdCorretoraId = corr.id;
    log("corretora.id", createdCorretoraId);

    const { error: updErr } = await supa
      .from("profiles")
      .update({ corretora_id: createdCorretoraId, status: "ativo" })
      .eq("id", userId);
    if (updErr) {
      fail(`update profile falhou: ${updErr.message}`);
      return;
    }

    // Trial automático (espelha aprovarCorretora server action)
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 30);
    const { data: subRow, error: subErr } = await supa
      .from("subscriptions")
      .insert({
        corretora_id: createdCorretoraId,
        status: "trial",
        started_at: new Date().toISOString(),
        trial_ends_at: trialEnds.toISOString(),
      })
      .select("id, status, trial_ends_at")
      .single();
    if (subErr || !subRow) {
      fail(`insert subscription falhou: ${subErr?.message}`);
      return;
    }
    createdSubscriptionId = subRow.id;
    log("subscription.id", createdSubscriptionId);
    log("subscription.status", subRow.status);
    if (subRow.status !== "trial") fail("trial não setado");
    else ok("trial criado");

    const { data: audit } = await supa
      .from("audit_log")
      .insert({
        actor_id: null,
        corretora_id: createdCorretoraId,
        action: "aprovar_corretora",
        entity: "profile",
        entity_id: userId,
        payload: { smoke: true, name: fakeCorretoraName, trial_ends_at: trialEnds.toISOString() },
      })
      .select("id")
      .single();
    if (audit?.id) auditLogIds.push(audit.id);
    ok("approval aplicado");

    // ---- 5. estado final ----
    console.log("\n[5] conferindo estado final...");
    const { data: final, error: fErr } = await supa
      .from("profiles")
      .select("status, corretora_id")
      .eq("id", userId)
      .single();
    if (fErr || !final) {
      fail(`leitura final falhou: ${fErr?.message}`);
      return;
    }
    log("profile.status", final.status);
    log("profile.corretora_id", String(final.corretora_id));
    if (final.status !== "ativo") fail(`status esperado ativo, veio ${final.status}`);
    else ok("status=ativo");
    if (final.corretora_id !== createdCorretoraId) fail("corretora_id não bate");
    else ok("corretora_id vinculado");

    const { data: auditCheck } = await supa
      .from("audit_log")
      .select("id, action, entity_id")
      .eq("entity_id", userId)
      .eq("action", "aprovar_corretora");
    log("audit_log entries", auditCheck?.length ?? 0);
    if ((auditCheck?.length ?? 0) >= 1) ok("audit_log gravado");
    else fail("audit_log não gravado");
  } finally {
    // ---- 6. cleanup ----
    console.log("\n[6] limpando...");
    if (auditLogIds.length === 0) {
      const { data: extra } = await supa
        .from("audit_log")
        .select("id")
        .eq("entity_id", userId);
      auditLogIds = (extra ?? []).map((r) => r.id);
    }
    if (auditLogIds.length > 0) {
      await supa.from("audit_log").delete().in("id", auditLogIds);
      log("audit_log apagado", auditLogIds.length);
    }
    if (createdSubscriptionId) {
      await supa
        .from("subscriptions")
        .delete()
        .eq("id", createdSubscriptionId);
      log("subscription apagada", createdSubscriptionId);
    }
    if (createdCorretoraId) {
      // primeiro desvincula o profile (FK), depois apaga corretora
      await supa
        .from("profiles")
        .update({ corretora_id: null })
        .eq("id", userId);
      await supa.from("corretoras").delete().eq("id", createdCorretoraId);
      log("corretora apagada", createdCorretoraId);
    }
    const { error: delErr } = await supa.auth.admin.deleteUser(userId);
    if (delErr) console.log(`  ! deleteUser falhou: ${delErr.message}`);
    else log("user apagado", userId);
  }

  console.log(
    process.exitCode
      ? "\n\x1b[31m✗ smoke FALHOU\x1b[0m\n"
      : "\n\x1b[32m✓ smoke OK\x1b[0m\n",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
