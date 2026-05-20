#!/usr/bin/env node
/**
 * Reagenda o cron job `milsaca-sync-cotacoes` SEM versionar o secret.
 *
 * Por que existe:
 *   `alter database postgres set ...` exige superuser que migrations no
 *   Supabase remoto não têm. A única forma de injetar um secret no
 *   `cron.schedule(...)` sem deixá-lo em git é via Management API,
 *   passando o valor como parâmetro de runtime.
 *
 * Uso:
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_xxx"     # Personal Access Token
 *   $env:CRON_SECRET           = "..."          # secret pra x-cron-secret
 *   node apps/web/scripts/apply-cron.mjs
 *
 * O script lê NEXT_PUBLIC_SUPABASE_URL de apps/web/.env.local pra extrair
 * o project ref e montar a URL da edge function. SUPABASE_ACCESS_TOKEN
 * vem de https://supabase.com/dashboard/account/tokens.
 *
 * Pra ROTACIONAR o secret:
 *   1) gera novo valor: `openssl rand -hex 32`
 *   2) atualiza no Supabase secrets (CLI ou dashboard):
 *      `supabase secrets set CRON_SECRET=<novo>` (pra edge function ler)
 *   3) roda este script com o mesmo novo valor (pra cron mandar no header)
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

function escapeSqlLiteral(s) {
  // pg literal: troca ' por '' e envolve em '...'
  return `'${String(s).replace(/'/g, "''")}'`;
}

async function main() {
  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  // Tanto PAT quanto CRON_SECRET aceitam vir do process.env (override)
  // ou do .env.local (default). Process vence.
  const token = process.env.SUPABASE_ACCESS_TOKEN ?? env.SUPABASE_ACCESS_TOKEN;
  const cronSecret = process.env.CRON_SECRET ?? env.CRON_SECRET;

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
  if (!cronSecret || cronSecret.length < 16) {
    fail("CRON_SECRET ausente ou muito curto (mín 16 chars).");
    console.error("  Gere com: openssl rand -hex 32");
    console.error('  $env:CRON_SECRET = "..." (ou adicionar no .env.local)');
    process.exit(1);
  }

  const ref = url.replace(/^https?:\/\//, "").split(".")[0];
  const fnUrl = `https://${ref}.functions.supabase.co/sync-cotacoes`;
  console.log(`projeto: ${ref}`);
  console.log(`edge fn: ${fnUrl}`);
  console.log(`schedule: 0 21 * * 1-5 (21:00 UTC, dias úteis)\n`);

  // Monta o SQL de schedule com o secret como literal escapado.
  // Idempotente: unschedule antes pra evitar duplicata.
  const sql = `
do $$
begin
  if exists (select 1 from cron.job where jobname = 'milsaca-sync-cotacoes') then
    perform cron.unschedule('milsaca-sync-cotacoes');
  end if;
end $$;

select cron.schedule(
  'milsaca-sync-cotacoes',
  '0 21 * * 1-5',
  $cron$
  select
    net.http_post(
      url     := ${escapeSqlLiteral(fnUrl)},
      headers := jsonb_build_object(
        'content-type',  'application/json',
        'x-cron-secret', ${escapeSqlLiteral(cronSecret)}
      ),
      body    := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $cron$
);
`;

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
    fail("apply-cron falhou");
    process.exit(1);
  }
  ok("cron agendado com sucesso");
  console.log(
    "\nValide com: select jobname, schedule from cron.job where jobname = 'milsaca-sync-cotacoes';",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
