#!/usr/bin/env node
/**
 * Cleanup do Supabase remoto — apaga dados inseridos pelo seed-remote.mjs.
 *
 * Uso:
 *   # Dry-run (default): mostra contagens sem apagar
 *   pnpm --filter @milsaca/web cleanup
 *
 *   # Apagar de verdade:
 *   pnpm --filter @milsaca/web cleanup -- --apply
 *
 * Apaga:
 *   - Corretoras Cooxupé e Carmo Coffees (e tudo vinculado a elas por
 *     corretora_id: leads, lead_events, contratos, lotes, classificacoes,
 *     produtor_contatos)
 *   - Cotações com source=CEPEA das regiões "Sul de Minas" e "Espírito Santo"
 *     (as do seed)
 *   - Favoritos apontando pras 2 corretoras seedadas
 *   - Reset do profile + produtor extended de quem tinha multi-role do seed:
 *     limpa corretora_id, roles=['produtor'], full_name=null, phone=null
 *     (e apaga o registro em produtores)
 *
 * NÃO apaga:
 *   - Schema, migrations, RLS, triggers, funções
 *   - O user em auth.users (ele continua podendo logar)
 *   - Corretoras que NÃO foram do seed (slug != cooxupe/carmo-coffees)
 *   - Cotações de outras fontes/regiões
 *
 * Idempotente: pode rodar de novo, vai mostrar 0 rows a apagar.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "..", ".env.local");

const SEEDED_SLUGS = ["cooxupe", "carmo-coffees"];
const SEEDED_COTACAO_REGIONS = ["Sul de Minas", "Espírito Santo"];
const SEEDED_COTACAO_SOURCE = "CEPEA";

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
  const apply = process.argv.includes("--apply");
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

  console.log(
    apply
      ? "\n⚠️  MODO APPLY: vai APAGAR dados do Supabase remoto.\n"
      : "\n🔍 MODO DRY-RUN: só mostra o que apagaria. Use --apply pra executar.\n",
  );

  // 1) Achar corretoras seedadas
  const { data: corretoras, error: corrErr } = await admin
    .from("corretoras")
    .select("id, name, slug")
    .in("slug", SEEDED_SLUGS);
  if (corrErr) throw corrErr;
  const corretoraIds = corretoras.map((c) => c.id);
  console.log(
    `Corretoras alvo (${corretoras.length}):`,
    corretoras.map((c) => `${c.name} (${c.slug})`).join(", ") || "—",
  );

  if (corretoraIds.length === 0) {
    console.log("\nNenhuma corretora do seed encontrada. Banco já limpo?");
    return;
  }

  // 2) Contagens
  const counts = await Promise.all([
    countWhere(admin, "lead_events", "corretora_id", corretoraIds),
    countWhere(admin, "classificacoes_cob", "corretora_id", corretoraIds),
    countWhere(admin, "lotes", "corretora_id", corretoraIds),
    countWhere(admin, "contratos", "corretora_id", corretoraIds),
    countWhere(admin, "leads", "corretora_id", corretoraIds),
    countWhere(admin, "produtor_contatos", "corretora_id", corretoraIds),
    countWhere(admin, "favoritos", "corretora_id", corretoraIds),
    countCotacoesSeed(admin),
  ]);

  const [
    leadEventsCt,
    classCt,
    lotesCt,
    contratosCt,
    leadsCt,
    contatosCt,
    favoritosCt,
    cotacoesCt,
  ] = counts;

  console.log("\nA apagar:");
  console.log(`  lead_events           ${leadEventsCt}`);
  console.log(`  classificacoes_cob    ${classCt}`);
  console.log(`  lotes                 ${lotesCt}`);
  console.log(`  contratos             ${contratosCt}`);
  console.log(`  leads                 ${leadsCt}`);
  console.log(`  produtor_contatos     ${contatosCt}`);
  console.log(`  favoritos             ${favoritosCt}`);
  console.log(`  cotacoes (seed)       ${cotacoesCt}`);
  console.log(`  corretoras            ${corretoraIds.length}`);

  // 3) Profiles que tinham multi-role + corretora vinculada às seedadas
  const { data: tainted } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("corretora_id", corretoraIds);
  console.log(
    `\nProfiles a resetar (corretora_id, roles, nome, phone): ${tainted?.length ?? 0}`,
  );
  for (const p of tainted ?? []) {
    console.log(`  - ${p.id.slice(0, 8)} (${p.full_name ?? "—"})`);
  }

  // 4) Produtores estendidos desses profiles
  let produtoresCt = 0;
  if ((tainted?.length ?? 0) > 0) {
    const ids = tainted.map((p) => p.id);
    const { count } = await admin
      .from("produtores")
      .select("*", { count: "exact", head: true })
      .in("profile_id", ids);
    produtoresCt = count ?? 0;
  }
  console.log(`Produtores (fazenda) a apagar: ${produtoresCt}`);

  if (!apply) {
    console.log(
      "\n→ Dry-run terminado. Reveja os números acima. Pra executar, rode com --apply.",
    );
    return;
  }

  // ============================================================
  // APPLY — apaga na ordem certa (filhos primeiro)
  // ============================================================
  console.log("\nApagando...");

  await del(admin, "lead_events", "corretora_id", corretoraIds);
  await del(admin, "classificacoes_cob", "corretora_id", corretoraIds);
  await del(admin, "lotes", "corretora_id", corretoraIds);
  await del(admin, "contratos", "corretora_id", corretoraIds);
  await del(admin, "leads", "corretora_id", corretoraIds);
  await del(admin, "produtor_contatos", "corretora_id", corretoraIds);
  await del(admin, "favoritos", "corretora_id", corretoraIds);

  // Cotações do seed (specifically)
  await admin
    .from("cotacoes")
    .delete()
    .eq("source", SEEDED_COTACAO_SOURCE)
    .in("region", SEEDED_COTACAO_REGIONS);
  console.log("  ✓ cotacoes (seed) apagadas");

  // Reset profiles taintados + produtores
  if ((tainted?.length ?? 0) > 0) {
    const ids = tainted.map((p) => p.id);
    await admin.from("produtores").delete().in("profile_id", ids);
    console.log("  ✓ produtores (fazenda) apagados");

    await admin
      .from("profiles")
      .update({
        corretora_id: null,
        roles: ["produtor"],
        full_name: null,
        phone: null,
      })
      .in("id", ids);
    console.log("  ✓ profiles resetados");
  }

  // Corretoras por último
  await admin.from("corretoras").delete().in("id", corretoraIds);
  console.log("  ✓ corretoras apagadas");

  console.log("\n✓ Cleanup completo. Banco pronto pra dados reais.");
  console.log("  Próximo passo: cadastrar corretoras reais via /admin");
}

async function countWhere(admin, table, col, ids) {
  const { count } = await admin
    .from(table)
    .select("*", { count: "exact", head: true })
    .in(col, ids);
  return count ?? 0;
}

async function countCotacoesSeed(admin) {
  const { count } = await admin
    .from("cotacoes")
    .select("*", { count: "exact", head: true })
    .eq("source", SEEDED_COTACAO_SOURCE)
    .in("region", SEEDED_COTACAO_REGIONS);
  return count ?? 0;
}

async function del(admin, table, col, ids) {
  const { error } = await admin.from(table).delete().in(col, ids);
  if (error) {
    console.error(`  ✗ ${table}:`, error.message);
    throw error;
  }
  console.log(`  ✓ ${table} apagado`);
}

main().catch((err) => {
  console.error("\nFalhou:", err);
  process.exit(1);
});
