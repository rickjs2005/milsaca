#!/usr/bin/env node
/**
 * diag-login — diagnostica usuários travados na tela "Preparando sua conta…"
 *
 * Lista: auth.users vs public.profiles, roles, corretora_id, RLS check,
 * e mostra exatamente o que o app vê quando o user loga.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

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

const env = await loadEnv();
const ref = env.NEXT_PUBLIC_SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0];
const token = process.env.SUPABASE_ACCESS_TOKEN ?? env.SUPABASE_ACCESS_TOKEN;

async function q(sql) {
  const r = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  return r.json();
}

console.log("\n=== auth.users vs public.profiles ===\n");
const rows = await q(`
  select
    au.id,
    au.email,
    au.email_confirmed_at is not null as confirmado,
    p.id is not null as tem_profile,
    p.full_name,
    p.roles,
    p.corretora_id,
    p.created_at as profile_created
  from auth.users au
  left join public.profiles p on p.id = au.id
  order by au.created_at desc
  limit 20;
`);
for (const r of rows) {
  const status =
    !r.confirmado ? "EMAIL NAO CONFIRMADO" :
    !r.tem_profile ? "SEM PROFILE (trigger falhou)" :
    !r.roles || r.roles.length === 0 ? "SEM ROLES" :
    "OK";
  console.log(`${status.padEnd(35)} ${r.email} (${r.id.slice(0, 8)})`);
  console.log(`    roles=${JSON.stringify(r.roles)} corretora_id=${r.corretora_id ?? "null"} full_name=${r.full_name ?? "null"}`);
}

console.log("\n=== Trigger handle_new_user ===\n");
const trig = await q(`
  select tgname, tgenabled, pg_get_triggerdef(oid) as def
  from pg_trigger
  where tgname like '%handle_new_user%' or tgname like '%on_auth%'
  order by tgname;
`);
for (const t of trig) {
  console.log(`${t.tgname} enabled=${t.tgenabled}`);
}

console.log("\n=== RLS policies em profiles ===\n");
const pol = await q(`
  select policyname, cmd, qual
  from pg_policies
  where schemaname = 'public' and tablename = 'profiles'
  order by policyname;
`);
for (const p of pol) {
  console.log(`  ${p.cmd.padEnd(8)} ${p.policyname}`);
  console.log(`    USING: ${p.qual ?? "—"}`);
}
