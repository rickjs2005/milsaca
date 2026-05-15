#!/usr/bin/env node
/**
 * Seed do Supabase remoto com dados de exemplo.
 *
 * Uso (a partir da raiz do monorepo):
 *   pnpm --filter @milsaca/web seed <email_do_produtor>
 *
 * Lê NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY de apps/web/.env.local.
 * Idempotente: pode rodar de novo sem duplicar dados.
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

function todayMinus(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Uso: node scripts/seed-remote.mjs <email_do_produtor>");
    process.exit(1);
  }

  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    console.error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SECRET_KEY em apps/web/.env.local",
    );
    process.exit(1);
  }

  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Encontrar produtor pelo email no auth.users
  console.log(`> Buscando user "${email}" em auth.users...`);
  let userId = null;
  let page = 1;
  while (!userId) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw error;
    const found = data.users.find(
      (u) => (u.email ?? "").toLowerCase() === email.toLowerCase(),
    );
    if (found) userId = found.id;
    if (data.users.length < 100) break;
    page += 1;
  }
  if (!userId) {
    console.error(
      `Usuário "${email}" não encontrado em auth.users. Faça login no /entrar primeiro.`,
    );
    process.exit(1);
  }
  console.log(`  user_id = ${userId}`);

  // 2) Garantir que o profile existe e é produtor
  const { error: profErr } = await admin
    .from("profiles")
    .upsert(
      { id: userId, role: "produtor", full_name: "Rick Januário" },
      { onConflict: "id" },
    );
  if (profErr) throw profErr;
  console.log("  profile atualizado (role=produtor)");

  // 3) Upsert corretora exemplo (Cooxupé)
  console.log("> Inserindo corretora exemplo (Cooxupé)...");
  const { data: corretora, error: corrErr } = await admin
    .from("corretoras")
    .upsert(
      {
        name: "Cooxupé",
        slug: "cooxupe",
        city: "Guaxupé",
        state: "MG",
        phone: "+5535999999999",
        email: "contato@cooxupe.com.br",
        verified: true,
      },
      { onConflict: "slug" },
    )
    .select("id, name")
    .single();
  if (corrErr) throw corrErr;
  console.log(`  corretora ${corretora.name} (${corretora.id})`);

  // 4) Cotações: 2 datas por tipo pra calcular variação
  console.log("> Inserindo cotações (Arábica × 2 datas, Conillón × 2 datas)...");
  const cotacoes = [
    {
      coffee_type: "arabica",
      price: 1417.0,
      reference_date: todayMinus(1),
      source: "CEPEA",
      region: "BR",
    },
    {
      coffee_type: "arabica",
      price: 1450.0,
      reference_date: todayMinus(0),
      source: "CEPEA",
      region: "BR",
    },
    {
      coffee_type: "conillon",
      price: 991.0,
      reference_date: todayMinus(1),
      source: "CEPEA",
      region: "BR",
    },
    {
      coffee_type: "conillon",
      price: 980.0,
      reference_date: todayMinus(0),
      source: "CEPEA",
      region: "BR",
    },
  ];
  for (const c of cotacoes) {
    // Sem unique constraint em (coffee_type, reference_date); deduplicamos manualmente:
    const { data: existing } = await admin
      .from("cotacoes")
      .select("id")
      .eq("coffee_type", c.coffee_type)
      .eq("reference_date", c.reference_date)
      .maybeSingle();
    if (existing) {
      const { error } = await admin
        .from("cotacoes")
        .update(c)
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await admin.from("cotacoes").insert(c);
      if (error) throw error;
    }
  }
  console.log(`  ${cotacoes.length} cotações ok`);

  // 5) Leads associados ao produtor
  console.log("> Inserindo leads de exemplo (associados ao produtor)...");
  const leads = [
    {
      corretora_id: corretora.id,
      produtor_id: userId,
      status: "convertido",
      coffee_type: "arabica",
      bag_count: 320,
      proposed_price: 1440.0,
      notes: "Proposta aceita após negociação por WhatsApp.",
    },
    {
      corretora_id: corretora.id,
      produtor_id: userId,
      status: "em_negociacao",
      coffee_type: "arabica",
      bag_count: 80,
      proposed_price: 1430.0,
      notes: "Aguardando contraproposta.",
    },
    {
      corretora_id: corretora.id,
      produtor_id: userId,
      status: "perdido",
      coffee_type: "conillon",
      bag_count: 200,
      proposed_price: 950.0,
      notes: "Preço abaixo do esperado pelo produtor.",
    },
  ];

  // Apaga só os leads "exemplo" desse produtor/corretora pra ficar idempotente.
  const { error: delErr } = await admin
    .from("leads")
    .delete()
    .eq("produtor_id", userId)
    .eq("corretora_id", corretora.id);
  if (delErr) throw delErr;

  const { error: insErr } = await admin.from("leads").insert(leads);
  if (insErr) throw insErr;
  console.log(`  ${leads.length} leads ok`);

  console.log("\n✓ Seed concluído.");
}

main().catch((err) => {
  console.error("Falhou:", err);
  process.exit(1);
});
