#!/usr/bin/env node
/**
 * Smoke test do PROGRAMA DE FUNDADORAS (ponta a ponta, nível banco/RLS/RPC).
 *
 * Este ambiente não tem SUPABASE_SECRET_KEY no .env.local — só o PAT
 * (SUPABASE_ACCESS_TOKEN) e a publishable key. Então:
 *   - operações elevadas (criar corretora/assinatura, ler RPC, togg-lar
 *     settings, contar, cleanup) vão pela Management API (/database/query),
 *     que roda SQL com privilégio (bypassa RLS).
 *   - o teste de RLS da waitlist usa a publishable key (papel anon).
 *
 * Valida:
 *   1. RPC founder_program_status() retorna {open,total,used}
 *   2. conceder plano "corretora-fundador" ATIVO VITALÍCIO conta used+1
 *   3. cap: used >= total => accepting=false
 *   4. fechamento manual: open=false => accepting=false (mesmo com vaga)
 *   5. RLS waitlist: anon INSERE mas NÃO LÊ; admin lê
 *
 * Restaura settings e apaga TODO dado fake no finally.
 * Uso: pnpm --filter @milsaca/web exec node scripts/smoke-fundadora.mjs
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

const log = (label, value) => console.log(`  ${String(label).padEnd(30)} ${value}`);
const ok = (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`);
const fail = (msg) => {
  console.log(`\x1b[31m✗\x1b[0m ${msg}`);
  process.exitCode = 1;
};
const qstr = (s) => String(s).replace(/'/g, "''");

async function main() {
  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const token = process.env.SUPABASE_ACCESS_TOKEN ?? env.SUPABASE_ACCESS_TOKEN;
  const publishable = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !token || !publishable) {
    console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_ACCESS_TOKEN / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    process.exit(1);
  }
  const ref = url.replace(/^https?:\/\//, "").split(".")[0];

  // SQL elevado via Management API
  async function sql(query) {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${ref}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      },
    );
    const text = await res.text();
    if (!res.ok) throw new Error(`SQL ${res.status}: ${text}`);
    return text.trim() ? JSON.parse(text) : [];
  }
  const status = async () => (await sql("select public.founder_program_status() as s"))[0].s;

  const anon = createClient(url, publishable, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = Date.now();
  const cName = `Smoke Fundadora ${stamp}`;
  const cSlug = `smoke-fundadora-${stamp}`;
  const wName = `Smoke Waitlist ${stamp}`;

  console.log("\n=== SMOKE: programa de fundadoras (Management API + anon) ===\n");
  log("projeto", ref);

  let corretoraId = null;
  let origOpen = null;
  let origTotal = null;

  try {
    // ---- 0. baseline ----
    const baseRows = await sql(
      "select (select value from public.platform_settings where key='founder_program_open') as open," +
        " (select value from public.platform_settings where key='founder_slots_total') as total," +
        " public.founder_program_status() as status",
    );
    origOpen = baseRows[0].open;
    origTotal = baseRows[0].total;
    const base = baseRows[0].status;
    log("open / total", `${JSON.stringify(origOpen)} / ${JSON.stringify(origTotal)}`);
    log("status inicial", JSON.stringify(base));
    if (typeof base.used !== "number" || typeof base.total !== "number") {
      fail("RPC não retornou {used,total} numéricos");
      return;
    }
    ok("RPC founder_program_status responde");
    const baseUsed = base.used;

    // ---- 1. conceder plano fundador vitalício => used+1 ----
    console.log("\n[1] conceder plano Fundadora vitalício...");
    const plan = (await sql(
      "select id, price_cents from public.plans where slug='corretora-fundador'",
    ))[0];
    if (!plan?.id) {
      fail("plano corretora-fundador não existe (migration aplicada?)");
      return;
    }
    if (plan.price_cents !== 0) fail("plano fundador deveria ser price_cents=0");
    else ok("plano fundador existe e é grátis");

    corretoraId = (await sql(
      `insert into public.corretoras (name, slug, verified) values ('${qstr(cName)}','${qstr(cSlug)}', true) returning id`,
    ))[0].id;
    log("corretora fake", corretoraId);

    const sub = (await sql(
      `insert into public.subscriptions (corretora_id, plan_id, status, started_at, current_period_start, current_period_end, trial_ends_at)` +
        ` values ('${corretoraId}','${plan.id}','active', now(), now(), now() + interval '100 years', null)` +
        ` returning status, current_period_end`,
    ))[0];
    log("subscription.status", sub.status);
    log("vitalício até", String(sub.current_period_end).slice(0, 10));
    const future = new Date(sub.current_period_end).getFullYear() >= new Date().getFullYear() + 99;
    if (sub.status === "active" && future) ok("assinatura ativa e vitalícia (isUsable)");
    else fail("assinatura não ficou ativa/vitalícia");

    const afterApprove = await status();
    log("used antes / depois", `${baseUsed} -> ${afterApprove.used}`);
    if (afterApprove.used === baseUsed + 1) ok("RPC conta a nova fundadora (used+1)");
    else fail(`used esperado ${baseUsed + 1}, veio ${afterApprove.used}`);

    // ---- 2. cap: used >= total ----
    console.log("\n[2] cap de vagas (total = used)...");
    await sql(
      `update public.platform_settings set value='${afterApprove.used}'::jsonb where key='founder_slots_total'`,
    );
    const capped = await status();
    log("status (total=used)", JSON.stringify(capped));
    const acceptingCapped = capped.open && capped.used < capped.total;
    if (!acceptingCapped) ok("cap cheio => accepting=false");
    else fail("deveria estar cheio e não aceitar");

    // ---- 3. fechamento manual ----
    console.log("\n[3] fechamento manual (open=false, com vaga)...");
    await sql(
      `update public.platform_settings set value='${JSON.stringify(origTotal)}'::jsonb where key='founder_slots_total'`,
    );
    await sql(
      `update public.platform_settings set value='false'::jsonb where key='founder_program_open'`,
    );
    const closed = await status();
    log("status (open=false)", JSON.stringify(closed));
    const acceptingClosed = closed.open && closed.used < closed.total;
    if (closed.open === false && !acceptingClosed) ok("fechado manual => accepting=false");
    else fail("fechamento manual não derrubou accepting");

    // ---- 4. RLS da waitlist ----
    console.log("\n[4] waitlist: anon insere / não lê; admin lê...");
    const { error: insErr } = await anon
      .from("corretora_waitlist")
      .insert({ name: wName, whatsapp: "5533999990000", city: "Manhuaçu", state: "MG" });
    if (insErr) fail(`anon insert bloqueado: ${insErr.message}`);
    else ok("anon consegue inserir na waitlist");

    const { data: anonRead } = await anon
      .from("corretora_waitlist")
      .select("id")
      .eq("name", wName);
    if ((anonRead?.length ?? 0) === 0) ok("anon NÃO lê a waitlist (RLS)");
    else fail("anon LEU a waitlist (RLS furada!)");

    const adminRows = await sql(
      `select status from public.corretora_waitlist where name='${qstr(wName)}'`,
    );
    log("admin vê linhas", adminRows.length);
    if (adminRows.length === 1 && adminRows[0].status === "aguardando")
      ok("admin lê a waitlist (status=aguardando)");
    else fail("admin não leu a waitlist corretamente");
  } finally {
    console.log("\n[cleanup] restaurando settings + apagando dados fake...");
    try {
      if (origOpen !== null)
        await sql(
          `update public.platform_settings set value='${JSON.stringify(origOpen)}'::jsonb where key='founder_program_open'`,
        );
      if (origTotal !== null)
        await sql(
          `update public.platform_settings set value='${JSON.stringify(origTotal)}'::jsonb where key='founder_slots_total'`,
        );
      await sql(`delete from public.corretora_waitlist where name='${qstr(wName)}'`);
      if (corretoraId)
        await sql(`delete from public.corretoras where id='${corretoraId}'`); // cascade apaga subscription
      log("cleanup", "ok");
      const final = await status();
      log("status final", JSON.stringify(final));
    } catch (e) {
      console.log(`  ! cleanup falhou: ${e.message}`);
    }
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
