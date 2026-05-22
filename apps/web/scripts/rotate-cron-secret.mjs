#!/usr/bin/env node
/**
 * Rotaciona o CRON_SECRET completo:
 *   1. Gera secret novo (32 bytes hex = 64 chars)
 *   2. Seta como secret da edge function via Management API
 *   3. Anexa/atualiza CRON_SECRET no apps/web/.env.local
 *   4. Imprime próximo passo (rodar apply-cron.mjs)
 *
 * O script é idempotente — pode rodar de novo a qualquer momento pra
 * gerar secret novo e invalidar o antigo.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { randomBytes } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "..", ".env.local");

const raw = await readFile(envPath, "utf8");
const env = {};
for (const line of raw.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const token = process.env.SUPABASE_ACCESS_TOKEN ?? env.SUPABASE_ACCESS_TOKEN;
const ref = url.replace(/^https?:\/\//, "").split(".")[0];

// 1. Gera secret
const newSecret = randomBytes(32).toString("hex");
console.log(`✓ Novo secret gerado (${newSecret.length} chars).`);

// 2. Seta no Supabase Functions secrets
const setRes = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/secrets`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([{ name: "CRON_SECRET", value: newSecret }]),
  },
);
if (!setRes.ok) {
  console.error(`✗ Falha ao setar secret no Supabase: ${setRes.status}`);
  console.error(await setRes.text());
  process.exit(1);
}
console.log(`✓ CRON_SECRET salvo nas Edge Functions secrets do Supabase.`);

// 3. Atualiza .env.local — substitui linha existente ou anexa
const lines = raw.split(/\r?\n/);
let updated = false;
const out = lines.map((l) => {
  if (l.startsWith("CRON_SECRET=")) {
    updated = true;
    return `CRON_SECRET=${newSecret}`;
  }
  return l;
});
if (!updated) {
  out.push(`CRON_SECRET=${newSecret}`);
}
await writeFile(envPath, out.join("\n"), "utf8");
console.log(`✓ CRON_SECRET ${updated ? "atualizado" : "anexado"} em .env.local.`);

console.log("\nPróximo passo:");
console.log("  node apps/web/scripts/apply-cron.mjs");
