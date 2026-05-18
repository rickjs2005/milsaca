#!/usr/bin/env node
/**
 * Smoke test de RBAC: valida que produtor e corretora não conseguem
 * fazer nada que é exclusivo do admin (read tabelas internas, escrever
 * em planos/assinaturas/app_admins, chamar RPCs protegidas).
 *
 * Cobre regressão da Fase 1 (superuser via app_admins) e Fase 2
 * (planos/assinaturas).
 *
 * Uso:
 *   node apps/web/scripts/smoke-rbac.mjs
 *
 * Não modifica nada permanentemente — cria contas fake e limpa no final.
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

const log = (label, value) => console.log(`  ${label.padEnd(36)} ${value}`);
const ok = (m) => console.log(`\x1b[32m✓\x1b[0m ${m}`);
const fail = (m) => {
  console.log(`\x1b[31m✗\x1b[0m ${m}`);
  process.exitCode = 1;
};

/**
 * Espera que a query falhe OU retorne 0 linhas (RLS pode bloquear
 * silenciosamente em SELECTs).
 */
function expectBlocked(label, result) {
  const blocked =
    !!result.error ||
    !Array.isArray(result.data) ||
    result.data.length === 0;
  if (blocked) {
    ok(`${label} — ${result.error ? result.error.message.slice(0, 60) : "0 rows"}`);
  } else {
    fail(`${label} — VAZAMENTO: ${JSON.stringify(result.data[0]).slice(0, 120)}`);
  }
}

/**
 * Bloqueio de write: aceita erro explícito OU 0 rows afetadas (RLS
 * silenciosamente rejeita UPDATE/DELETE quando policy de write USING
 * não permite — Postgres não levanta erro, só não toca o row).
 *
 * Pra detectar isso confiável, a query precisa ter `.select()` no
 * final pra forçar o retorno das rows tocadas.
 */
function expectWriteBlocked(label, result) {
  if (result.error) {
    ok(`${label} — ${result.error.message.slice(0, 60)}`);
    return;
  }
  const rows = Array.isArray(result.data) ? result.data.length : 0;
  if (rows === 0) {
    ok(`${label} — 0 rows afetadas (RLS bloqueou silenciosamente)`);
  } else {
    fail(`${label} — WRITE PASSOU: ${JSON.stringify(result.data[0]).slice(0, 120)}`);
  }
}

async function main() {
  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret = env.SUPABASE_SECRET_KEY;
  if (!url || !anonKey || !secret) {
    console.error("Faltam env vars");
    process.exit(1);
  }

  const admin = createClient(url, secret, {
    auth: { persistSession: false },
  });

  console.log("\n=== SMOKE: RBAC ===\n");

  const stamp = Date.now();
  const password = "smoke-rbac-pw-9999";
  const produtorEmail = `smoke-produtor-${stamp}@milsaca.test`;
  const corretoraEmail = `smoke-corretora-${stamp}@milsaca.test`;

  // ---- Setup ----
  console.log("[setup] criando contas fake...");

  const { data: produtorUser } = await admin.auth.admin.createUser({
    email: produtorEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Produtor Smoke", role: "produtor" },
  });
  log("produtor.id", produtorUser?.user?.id);

  // Cria corretora real + user corretora vinculado
  const { data: corretora } = await admin
    .from("corretoras")
    .insert({
      name: `RBAC Smoke ${stamp}`,
      slug: `rbac-smoke-${stamp}`,
      verified: true,
    })
    .select("id")
    .single();
  log("corretora.id", corretora.id);

  const { data: corretoraUser } = await admin.auth.admin.createUser({
    email: corretoraEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Corretora Smoke", role: "corretora" },
  });
  log("corretora_user.id", corretoraUser?.user?.id);

  // Linka profile da corretora (handle_new_user cria pending; aprovamos manual)
  await admin
    .from("profiles")
    .update({
      corretora_id: corretora.id,
      status: "ativo",
    })
    .eq("id", corretoraUser.user.id);

  // ---- Clientes autenticados ----
  const produtorClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await produtorClient.auth.signInWithPassword({
    email: produtorEmail,
    password,
  });

  const corretoraClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await corretoraClient.auth.signInWithPassword({
    email: corretoraEmail,
    password,
  });

  try {
    // =========================================================
    // PRODUTOR
    // =========================================================
    console.log("\n[produtor] tentando acessar áreas admin...");

    {
      const r = await produtorClient.rpc("is_app_admin");
      if (r.data === true) fail("produtor virou admin no is_app_admin()");
      else ok("is_app_admin() retorna false");
    }
    {
      const r = await produtorClient.rpc("list_pending_corretora_signups");
      if (r.error) ok(`RPC pendentes bloqueada — ${r.error.message}`);
      else fail(`RPC pendentes retornou ${r.data?.length} linhas pra produtor`);
    }
    expectBlocked(
      "produtor read app_admins",
      await produtorClient.from("app_admins").select("user_id").limit(5),
    );
    expectBlocked(
      "produtor read audit_log",
      await produtorClient.from("audit_log").select("id").limit(5),
    );
    expectBlocked(
      "produtor read subscriptions",
      await produtorClient.from("subscriptions").select("id").limit(5),
    );
    expectBlocked(
      "produtor read whatsapp_leads",
      await produtorClient.from("whatsapp_leads").select("id").limit(5),
    );
    expectWriteBlocked(
      "produtor insert plan",
      await produtorClient
        .from("plans")
        .insert({ name: "Hack", slug: `hack-${stamp}`, price_cents: 1 })
        .select(),
    );
    expectWriteBlocked(
      "produtor update corretora alheia",
      await produtorClient
        .from("corretoras")
        .update({ verified: false })
        .eq("id", corretora.id)
        .select(),
    );
    expectWriteBlocked(
      "produtor insert app_admins",
      await produtorClient
        .from("app_admins")
        .insert({ user_id: produtorUser.user.id, notes: "hack" })
        .select(),
    );

    // =========================================================
    // CORRETORA (não-admin, dona)
    // =========================================================
    console.log("\n[corretora] tentando acessar áreas admin...");

    {
      const r = await corretoraClient.rpc("is_app_admin");
      if (r.data === true) fail("corretora virou admin");
      else ok("is_app_admin() retorna false");
    }
    {
      const r = await corretoraClient.rpc("list_pending_corretora_signups");
      if (r.error) ok(`RPC pendentes bloqueada — ${r.error.message}`);
      else fail(`RPC pendentes retornou ${r.data?.length} linhas pra corretora`);
    }
    expectBlocked(
      "corretora read app_admins",
      await corretoraClient.from("app_admins").select("user_id").limit(5),
    );
    expectWriteBlocked(
      "corretora insert plan",
      await corretoraClient
        .from("plans")
        .insert({ name: "Hack", slug: `hack-c-${stamp}`, price_cents: 1 })
        .select(),
    );
    expectWriteBlocked(
      "corretora insert subscription pra outra",
      await corretoraClient
        .from("subscriptions")
        .insert({
          corretora_id: corretora.id,
          status: "active",
        })
        .select(),
    );
    expectWriteBlocked(
      "corretora self-promote em app_admins",
      await corretoraClient
        .from("app_admins")
        .insert({ user_id: corretoraUser.user.id, notes: "self" })
        .select(),
    );

    // Corretora dona DEVE conseguir ler corretora própria
    {
      const r = await corretoraClient
        .from("corretoras")
        .select("id, name, cnpj")
        .eq("id", corretora.id)
        .maybeSingle();
      if (r.error) fail(`corretora não leu a própria: ${r.error.message}`);
      else if (r.data?.id === corretora.id)
        ok("corretora lê a própria via RLS");
      else fail("corretora não viu o próprio registro");
    }

    // Corretora NÃO deve ler outra corretora (vamos criar uma)
    const { data: outra } = await admin
      .from("corretoras")
      .insert({
        name: `Outra ${stamp}`,
        slug: `outra-${stamp}`,
        cnpj: "99887766000155",
      })
      .select("id")
      .single();
    {
      const r = await corretoraClient
        .from("corretoras")
        .select("cnpj")
        .eq("id", outra.id)
        .maybeSingle();
      if (r.data?.cnpj) fail(`corretora viu CNPJ alheio: ${r.data.cnpj}`);
      else ok("corretora não vê outra corretora");
    }
    await admin.from("corretoras").delete().eq("id", outra.id);
  } finally {
    console.log("\n[cleanup] removendo contas fake...");
    await admin
      .from("profiles")
      .update({ corretora_id: null })
      .eq("id", corretoraUser?.user?.id);
    if (corretora?.id) {
      await admin.from("corretoras").delete().eq("id", corretora.id);
      log("corretora apagada", corretora.id);
    }
    if (produtorUser?.user?.id) {
      await admin.auth.admin.deleteUser(produtorUser.user.id);
      log("produtor user apagado", produtorUser.user.id);
    }
    if (corretoraUser?.user?.id) {
      await admin.auth.admin.deleteUser(corretoraUser.user.id);
      log("corretora user apagado", corretoraUser.user.id);
    }
  }

  console.log(
    process.exitCode
      ? "\n\x1b[31m✗ smoke RBAC FALHOU\x1b[0m\n"
      : "\n\x1b[32m✓ smoke RBAC OK\x1b[0m\n",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
