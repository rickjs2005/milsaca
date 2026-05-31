#!/usr/bin/env node
/**
 * seed-conilon-now — busca a cotação atual do Conilon CEPEA ES via Notícias
 * Agrícolas e faz upsert em market_quotes. Usado pra popular o indicador
 * imediatamente (antes do próximo cron e antes do deploy da edge function
 * atualizada).
 *
 * Reusa a mesma estratégia do adapter Deno em supabase/functions/sync-cotacoes.
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

const env = await loadEnv();
const ref = env.NEXT_PUBLIC_SUPABASE_URL.replace(/^https?:\/\//, "").split(
  ".",
)[0];
const token = process.env.SUPABASE_ACCESS_TOKEN ?? env.SUPABASE_ACCESS_TOKEN;

async function fetchConilon() {
  const url =
    "https://www.noticiasagricolas.com.br/cotacoes/cafe/indicador-cepea-esalq-cafe-conillon";
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "MilsacaBot/1.0 (+https://milsaca.com.br; milsaca2026@gmail.com)",
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  // Tabela: pula até <tbody>, depois pega 2º <td> da primeira <tr> (1º é data)
  const tableMatch = html.match(
    /Valor\s+R\$[\s\S]*?<tbody[\s\S]*?<tr[\s\S]*?<td[^>]*>\s*\d{1,2}\/\d{1,2}\/\d{4}\s*<\/td>\s*<td[^>]*>\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*<\/td>/i,
  );
  let priceReais = null;
  if (tableMatch) {
    priceReais = parseFloat(
      tableMatch[1].replace(/\./g, "").replace(",", "."),
    );
  }

  // Fallback (sanidade Conilon R$ 500-2500 — exclui dimensões de ad como 336,28)
  if (!Number.isFinite(priceReais) || priceReais < 500 || priceReais > 2500) {
    const all = html.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/g) ?? [];
    for (const m of all) {
      const v = parseFloat(m.replace(/\./g, "").replace(",", "."));
      if (v >= 500 && v <= 2500) {
        priceReais = v;
        break;
      }
    }
  }

  if (!Number.isFinite(priceReais)) {
    throw new Error("Preço não encontrado / fora da faixa de sanidade");
  }

  // Variação opcional
  const varMatch =
    html.match(/\(\s*([+-]?\d+[.,]\d+)\s*%\s*\)/) ??
    html.match(/Var[^<]*?([+-]?\d+[.,]\d+)\s*%/i);
  const variation =
    varMatch && Number.isFinite(parseFloat(varMatch[1].replace(",", ".")))
      ? parseFloat(varMatch[1].replace(",", "."))
      : null;

  return { priceReais, variation, source_url: url };
}

async function upsert(price, variation, sourceUrl) {
  const sql = `
    insert into public.market_quotes (
      source, symbol, price_brl_cents, price_usd_cents, variation_pct,
      quoted_at, fetched_at, source_url, meta
    ) values (
      'cepea_esalq', 'conilon_es_esalq', ${Math.round(price * 100)}, null,
      ${variation == null ? "null" : variation},
      now(), now(),
      '${sourceUrl}',
      '${JSON.stringify({
        provider_chain: "noticias_agricolas",
        unit: "BRL/saca-60kg",
        raw_price: price,
        seeded_by: "seed-conilon-now.mjs",
      })}'::jsonb
    )
    on conflict (source, symbol) do update set
      price_brl_cents = excluded.price_brl_cents,
      variation_pct = excluded.variation_pct,
      quoted_at = excluded.quoted_at,
      fetched_at = excluded.fetched_at,
      source_url = excluded.source_url,
      meta = excluded.meta
    returning source, symbol, price_brl_cents, variation_pct, quoted_at;
  `;
  const r = await fetch(
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
  if (!r.ok) {
    throw new Error(`SQL falhou (${r.status}): ${await r.text()}`);
  }
  return r.json();
}

console.log("→ Buscando Conilon CEPEA ES...");
const { priceReais, variation, source_url } = await fetchConilon();
console.log(`✓ R$ ${priceReais.toFixed(2)}/saca` + (variation != null ? ` (${variation > 0 ? "+" : ""}${variation}%)` : ""));

console.log("→ Upserting market_quotes...");
const result = await upsert(priceReais, variation, source_url);
console.log("✓ Salvo:", JSON.stringify(result, null, 2));

// Marca quote_sources.last_success_at
await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    query: `update public.quote_sources set last_success_at = now(), last_error_at = null, last_error_message = null where slug = 'cepea_conilon_es';`,
  }),
});
console.log("✓ quote_sources atualizado");
