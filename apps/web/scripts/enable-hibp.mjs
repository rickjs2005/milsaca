#!/usr/bin/env node
// Ativa (ou desativa) a proteção de senha vazada (HaveIBeenPwned) no Supabase Auth.
//
// ⚠️ HIBP exige Supabase Pro. Na org no plano Free a Management API responde
//    HTTP 402 — este script detecta e avisa, sem quebrar.
//
// Uso (a partir de apps/web):
//   node scripts/enable-hibp.mjs           # ativa  (password_hibp_enabled=true)
//   node scripts/enable-hibp.mjs false     # desativa
//
// Lê NEXT_PUBLIC_SUPABASE_URL + SUPABASE_ACCESS_TOKEN do .env.local (ou do
// ambiente). O ref do projeto é derivado da URL. Espelha o padrão de
// scripts/set-autoconfirm.mjs.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "..", ".env.local");
const env = {};
try {
  const raw = await readFile(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
} catch {
  // sem .env.local — depende das envs do processo
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const token = process.env.SUPABASE_ACCESS_TOKEN ?? env.SUPABASE_ACCESS_TOKEN;
if (!url || !token) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_ACCESS_TOKEN (.env.local ou ambiente).");
  process.exit(1);
}
const ref = url.replace(/^https?:\/\//, "").split(".")[0];
const enable = String(process.argv[2] ?? "true").toLowerCase() === "true";
const endpoint = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

// Estado atual (informativo)
const before = await fetch(endpoint, { headers });
if (before.ok) {
  const cfg = await before.json();
  console.log(`HIBP atual (password_hibp_enabled): ${cfg.password_hibp_enabled}`);
}

// Aplica
const res = await fetch(endpoint, {
  method: "PATCH",
  headers,
  body: JSON.stringify({ password_hibp_enabled: enable }),
});
const text = await res.text();
console.log(`status: ${res.status}`);

if (res.status === 402) {
  console.log("⛔ HIBP exige Supabase Pro. Faça upgrade do projeto e rode de novo.");
  process.exit(2);
}
if (!res.ok) {
  console.log(text);
  process.exit(1);
}

// Confirma
let val = enable;
try { val = JSON.parse(text).password_hibp_enabled ?? enable; } catch {}
console.log(`✅ password_hibp_enabled = ${val}`);
