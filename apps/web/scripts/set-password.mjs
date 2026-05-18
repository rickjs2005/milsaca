#!/usr/bin/env node
/**
 * Define a senha de um user existente via Admin API.
 *
 * Uso (a partir da raiz do monorepo):
 *   node apps/web/scripts/set-password.mjs <email> <senha>
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

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    console.error("Uso: node scripts/set-password.mjs <email> <senha>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Senha precisa ter ao menos 8 caracteres.");
    process.exit(1);
  }

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

  const { data: list, error: listErr } = await supa.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) {
    console.error("Erro listUsers:", listErr.message);
    process.exit(1);
  }
  const target = list.users.find((u) => u.email === email);
  if (!target) {
    console.error(`User ${email} não encontrado.`);
    process.exit(1);
  }

  const { error } = await supa.auth.admin.updateUserById(target.id, {
    password,
  });
  if (error) {
    console.error("Erro updateUser:", error.message);
    process.exit(1);
  }

  console.log(`✓ Senha de ${email} atualizada.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
