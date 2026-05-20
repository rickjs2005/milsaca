#!/usr/bin/env node
/**
 * Aplica um arquivo SQL no banco Supabase via Management API.
 *
 * Uso:
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_xxx"   # Personal Access Token
 *   node scripts/apply-migration.mjs <caminho-do-sql>
 *
 * O PAT vem de supabase.com/dashboard/account/tokens. Project ref é
 * extraído de NEXT_PUBLIC_SUPABASE_URL no .env.local.
 *
 * Não substitui `supabase db push` (que rastreia o schema em
 * supabase/migrations/), mas serve pra aplicar migrations ad-hoc quando
 * o CLI não está instalado.
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

const ok = (m) => console.log(`\x1b[32m✓\x1b[0m ${m}`);
const fail = (m) => console.log(`\x1b[31m✗\x1b[0m ${m}`);

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error("Uso: node scripts/apply-migration.mjs <caminho-do-sql>");
    process.exit(1);
  }

  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  // PAT pode vir do process.env (preferível pra CI/uso pontual) OU do
  // .env.local (conveniente pra dev local recorrente). Process vence
  // pra permitir override pontual sem editar o arquivo.
  const token = process.env.SUPABASE_ACCESS_TOKEN ?? env.SUPABASE_ACCESS_TOKEN;
  if (!url) {
    fail("NEXT_PUBLIC_SUPABASE_URL ausente em apps/web/.env.local");
    process.exit(1);
  }
  if (!token) {
    fail("SUPABASE_ACCESS_TOKEN não setado (.env.local ou process.env).");
    console.error(
      "  Crie em https://supabase.com/dashboard/account/tokens e exporte:",
    );
    console.error('  $env:SUPABASE_ACCESS_TOKEN = "sbp_xxx"');
    console.error("  OU adicione SUPABASE_ACCESS_TOKEN=... no apps/web/.env.local");
    process.exit(1);
  }

  const ref = url.replace(/^https?:\/\//, "").split(".")[0];
  console.log(`projeto: ${ref}`);
  console.log(`arquivo: ${fileArg}`);

  const sql = await readFile(fileArg, "utf8");
  console.log(`tamanho:  ${sql.length} bytes\n`);

  const res = await fetch(
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

  const text = await res.text();
  console.log(`status: ${res.status}`);
  if (text.trim()) console.log(text);

  if (!res.ok) {
    fail("migration falhou");
    process.exit(1);
  }
  ok("migration aplicada");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
