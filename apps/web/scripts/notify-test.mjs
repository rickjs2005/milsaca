#!/usr/bin/env node
/**
 * Insere notifications de teste pra um user existente.
 * Útil pra visualizar a tela de notificações (web + mobile) sem precisar
 * percorrer o ciclo completo corretora → produtor.
 *
 * Uso (a partir da raiz do monorepo):
 *   pnpm --filter @milsaca/web notify-test <email>
 *
 * Lê NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY de apps/web/.env.local.
 * Usa service_role: bypassa RLS (policy de admin permite INSERT, então
 * isso simula notifications "do sistema").
 *
 * Insere 6 notifications cobrindo os 6 kinds, marcando 2 como lidas.
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

const SAMPLES = [
  {
    kind: "lead",
    title: "Nova proposta de café",
    body: "Arábica natural — 100 sacas a R$ 1.450,00/sc",
    minutesAgo: 5,
    read: false,
  },
  {
    kind: "contrato",
    title: "Contrato ativado",
    body: "Contrato cooxupe-2026-0042",
    minutesAgo: 35,
    read: false,
  },
  {
    kind: "entrega",
    title: "Entrega recebida",
    body: "Entrega #1 — 100 sacas",
    minutesAgo: 120,
    read: false,
  },
  {
    kind: "pagamento",
    title: "Pagamento liberado",
    body: "R$ 144.275,00 — líquido após descontos",
    minutesAgo: 60 * 5,
    read: false,
  },
  {
    kind: "cotacao",
    title: "Cotação do dia",
    body: "Arábica Bica Corrida — R$ 1.475,50 (+0,32%)",
    minutesAgo: 60 * 8,
    read: true,
  },
  {
    kind: "sistema",
    title: "Bem-vindo ao Milsaca",
    body: "Sua conta está pronta. Confira suas cotações favoritas.",
    minutesAgo: 60 * 24,
    read: true,
  },
];

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Uso: node scripts/notify-test.mjs <email>");
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

  const now = Date.now();
  const rows = SAMPLES.map((s) => {
    const createdAt = new Date(now - s.minutesAgo * 60_000).toISOString();
    return {
      user_id: target.id,
      kind: s.kind,
      title: s.title,
      body: s.body,
      data: { test: true },
      read_at: s.read ? createdAt : null,
      created_at: createdAt,
    };
  });

  const { error: insErr } = await supa.from("notifications").insert(rows);
  if (insErr) {
    console.error("Erro ao inserir notifications:", insErr.message);
    process.exit(1);
  }

  console.log(`✓ ${rows.length} notifications inseridas para ${email}.`);
  console.log(`  Kinds: ${SAMPLES.map((s) => s.kind).join(", ")}`);
  console.log(`  ${SAMPLES.filter((s) => !s.read).length} não lidas, ${SAMPLES.filter((s) => s.read).length} lidas.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
