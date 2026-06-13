#!/usr/bin/env node
/**
 * Limpa TODOS os objetos dos buckets de Storage do Supabase remoto.
 *
 * Por quê um script (e não SQL): o Supabase bloqueia DELETE direto em
 * storage.objects (trigger storage.protect_delete) pra evitar blobs
 * órfãos — a remoção tem que ir pela Storage API, que apaga metadata +
 * blob de fato. A Storage API admin exige a service/secret key.
 *
 * Credencial: usa SUPABASE_SECRET_KEY do apps/web/.env.local se existir;
 * senão, busca a service_role via Management API usando SUPABASE_ACCESS_TOKEN.
 * NUNCA imprime a chave.
 *
 * Uso:
 *   node apps/web/scripts/wipe-storage.mjs            # dry-run (lista)
 *   node apps/web/scripts/wipe-storage.mjs --apply    # apaga de verdade
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
const BUCKETS = ["laudos", "comprovantes", "social"];

async function loadEnv() {
  const raw = await readFile(resolve(here, "..", ".env.local"), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

async function resolveSecret(env, ref) {
  if (env.SUPABASE_SECRET_KEY) return { secret: env.SUPABASE_SECRET_KEY, via: ".env.local" };
  const token = env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error("Faltam SUPABASE_SECRET_KEY e SUPABASE_ACCESS_TOKEN em .env.local");
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Management API /api-keys falhou: ${res.status} ${await res.text()}`);
  const keys = await res.json();
  // Preferência: service_role (legacy, bypassa RLS) > qualquer chave 'secret'
  const pick =
    keys.find((k) => k.name === "service_role") ||
    keys.find((k) => k.type === "secret" || /secret/i.test(k.name || "")) ||
    keys.find((k) => String(k.api_key || "").startsWith("sb_secret"));
  const secret = pick?.api_key;
  if (!secret) throw new Error(`Não encontrei service/secret key (nomes: ${keys.map((k) => k.name).join(", ")})`);
  return { secret, via: `Management API (${pick.name})` };
}

async function listAll(admin, bucket, prefix = "") {
  const out = [];
  const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
  for (const e of data || []) {
    const full = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.id === null) out.push(...(await listAll(admin, bucket, full))); // folder
    else out.push(full);
  }
  return out;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL em .env.local");
  const ref = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
  if (!ref) throw new Error(`Não extraí o ref do projeto de: ${url}`);

  const { secret, via } = await resolveSecret(env, ref);
  console.log(`[wipe-storage] projeto ${ref} | credencial via ${via} | modo: ${apply ? "APPLY" : "dry-run"}`);

  const admin = createClient(url, secret, { auth: { persistSession: false } });

  let total = 0;
  for (const bucket of BUCKETS) {
    let paths;
    try {
      paths = await listAll(admin, bucket);
    } catch (e) {
      console.log(`  - ${bucket}: (pulado: ${e.message})`);
      continue;
    }
    console.log(`  - ${bucket}: ${paths.length} objeto(s)`);
    for (const p of paths) console.log(`      • ${p}`);
    total += paths.length;
    if (apply && paths.length) {
      const { error } = await admin.storage.from(bucket).remove(paths);
      if (error) throw new Error(`remove ${bucket}: ${error.message}`);
      console.log(`      ✓ removidos ${paths.length} de ${bucket}`);
    }
  }

  console.log(`[wipe-storage] total: ${total} objeto(s) ${apply ? "removidos" : "(dry-run, nada apagado)"}`);
  if (!apply && total) console.log("[wipe-storage] rode com --apply pra apagar de verdade.");
}

main().catch((e) => {
  console.error("[wipe-storage] ERRO:", e.message);
  process.exit(1);
});
