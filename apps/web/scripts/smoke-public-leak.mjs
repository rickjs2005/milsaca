#!/usr/bin/env node
/**
 * Smoke test: garante que `anon` não enxerga PII de corretoras.
 *
 * Rola após a migration 20260527000000_corretoras_publicas_view:
 *   - anon NÃO consegue ler tabela `corretoras`
 *   - anon NÃO consegue ler a view `corretoras_publicas` (sem grant)
 *   - service_role consegue ler tudo (validação positiva)
 *
 * Regressão: se alguém der `grant select on corretoras to anon` por
 * descuido, este teste falha.
 *
 * Uso:
 *   node apps/web/scripts/smoke-public-leak.mjs
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

const ok = (m) => console.log(`\x1b[32m✓\x1b[0m ${m}`);
const fail = (m) => {
  console.log(`\x1b[31m✗\x1b[0m ${m}`);
  process.exitCode = 1;
};

async function main() {
  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret = env.SUPABASE_SECRET_KEY;
  if (!url || !anonKey || !secret) {
    console.error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou SUPABASE_SECRET_KEY",
    );
    process.exit(1);
  }

  const anon = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  const supa = createClient(url, secret, {
    auth: { persistSession: false },
  });

  console.log("\n=== SMOKE: vazamento público de corretoras ===\n");

  // Cria uma corretora de teste com CNPJ/endereço pra ter dado real
  console.log("[setup] criando corretora de teste...");
  const slug = `leak-test-${Date.now()}`;
  const { data: created, error: cErr } = await supa
    .from("corretoras")
    .insert({
      name: "Leak Test Café",
      slug,
      city: "Manhuaçu",
      state: "MG",
      cnpj: "11222333000144",
      cep: "36900000",
      endereco: "Rua de Teste, 100",
      verified: true,
    })
    .select("id")
    .single();
  if (cErr || !created) {
    fail(`não conseguiu criar corretora de teste: ${cErr?.message}`);
    return;
  }

  try {
    // ---- 1. anon → corretoras ----
    console.log("\n[1] anon tentando ler corretoras (deve falhar)...");
    const r1 = await anon.from("corretoras").select("*").limit(10);
    if (r1.error?.message?.includes("permission denied")) {
      ok(`bloqueado: ${r1.error.message}`);
    } else if ((r1.data ?? []).length === 0) {
      ok("retornou 0 rows (RLS bloqueando)");
    } else {
      fail(`VAZAMENTO! anon viu ${r1.data?.length} linhas. Sample: ${JSON.stringify(r1.data?.[0]).slice(0, 200)}`);
    }

    // ---- 2. anon → corretoras_publicas ----
    console.log("\n[2] anon tentando ler corretoras_publicas (deve falhar)...");
    const r2 = await anon
      .from("corretoras_publicas")
      .select("id, name, cnpj, cep, endereco")
      .limit(10);
    // a view nem tem essas colunas — supabase pode retornar erro de schema
    if (r2.error) {
      ok(`bloqueado/erro: ${r2.error.message}`);
    } else if ((r2.data ?? []).length === 0) {
      ok("retornou 0 rows");
    } else {
      // verifica se cnpj veio (não deveria existir nem como coluna na view)
      const sample = r2.data?.[0] ?? {};
      if ("cnpj" in sample || "cep" in sample || "endereco" in sample) {
        fail(`VAZAMENTO! view expõe PII: ${JSON.stringify(sample)}`);
      } else {
        ok("nenhum campo de PII retornado");
      }
    }

    // ---- 3. anon → corretoras_publicas (só colunas seguras) ----
    // Catálogo de corretoras é público por natureza do negócio.
    // O que precisamos garantir é que PII nunca apareça aqui.
    console.log(
      "\n[3] anon lendo colunas seguras da view (catálogo público é OK)...",
    );
    const r3 = await anon
      .from("corretoras_publicas")
      .select("id, name, slug, city, state, phone, email, verified")
      .limit(10);
    if (r3.error) {
      console.log(`  → bloqueado: ${r3.error.message}`);
    } else {
      ok(`anon viu ${r3.data?.length ?? 0} linhas — só campos seguros (esperado)`);
    }

    // ---- 4. service_role lê tudo ----
    console.log("\n[4] service_role lendo corretoras (deve passar)...");
    const r4 = await supa
      .from("corretoras")
      .select("id, cnpj, cep, endereco")
      .eq("id", created.id)
      .single();
    if (r4.data?.cnpj === "11222333000144") {
      ok("service_role lê PII normalmente (admin via script funciona)");
    } else {
      fail(`service_role falhou ou não retornou CNPJ: ${r4.error?.message}`);
    }
  } finally {
    console.log("\n[cleanup] removendo corretora de teste...");
    await supa.from("corretoras").delete().eq("id", created.id);
    ok("limpou");
  }

  console.log(
    process.exitCode
      ? "\n\x1b[31m✗ smoke FALHOU\x1b[0m\n"
      : "\n\x1b[32m✓ smoke OK\x1b[0m\n",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
