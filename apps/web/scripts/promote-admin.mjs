#!/usr/bin/env node
/**
 * Promove um user existente a admin (mantendo outros roles).
 *
 * Uso (a partir da raiz do monorepo):
 *   pnpm --filter @milsaca/web promote-admin <email>
 *
 * Lê NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY de apps/web/.env.local.
 * Idempotente: se já é admin, mostra mensagem e sai 0.
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
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Uso: node scripts/promote-admin.mjs <email>");
    process.exit(1);
  }

  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SECRET_KEY em .env.local");
    process.exit(1);
  }

  const supa = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Acha o auth.user pelo email via Admin API
  const { data: list, error: listErr } = await supa.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) {
    console.error("Erro ao listar users:", listErr.message);
    process.exit(1);
  }
  const target = list.users.find((u) => u.email === email);
  if (!target) {
    console.error(`User com email ${email} não encontrado.`);
    process.exit(1);
  }

  // Lê roles atuais
  const { data: profile, error: profErr } = await supa
    .from("profiles")
    .select("roles, full_name")
    .eq("id", target.id)
    .maybeSingle();
  if (profErr) {
    console.error("Erro ao ler profile:", profErr.message);
    process.exit(1);
  }
  if (!profile) {
    console.error(`Profile não encontrado para ${email} (trigger handle_new_user falhou?)`);
    process.exit(1);
  }

  const roles = new Set(profile.roles ?? []);
  if (roles.has("admin")) {
    console.log(`✓ ${email} já é admin (roles: ${[...roles].join(", ")}).`);
    process.exit(0);
  }
  roles.add("admin");

  const newRoles = [...roles];
  const { error: updErr } = await supa
    .from("profiles")
    .update({ roles: newRoles })
    .eq("id", target.id);
  if (updErr) {
    console.error("Erro ao atualizar roles:", updErr.message);
    process.exit(1);
  }

  console.log(`✓ ${email} promovido a admin.`);
  console.log(`  Roles agora: ${newRoles.join(", ")}`);
  console.log(`  Próximo login → /painel/escolher (multi-role).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
