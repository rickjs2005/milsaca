// supabase/functions/sync-cotacoes/index.ts
//
// Edge Function que sincroniza snapshots de cotação de café e câmbio.
// Adapters portados do Kavita (kavita-backend/services/cotacoes/).
//
// Disparo:
//   - pg_cron (cron job no banco) → 18h America/Sao_Paulo, dias úteis
//   - manual: supabase functions invoke sync-cotacoes
//   - HTTP POST direto com header `x-cron-secret: $CRON_SECRET`
//
// Estratégia:
//   1. Roda os 4 adapters em paralelo (fail-soft via Promise.allSettled)
//   2. Cada Quote válida vira upsert em public.market_quotes (PK = source+symbol)
//   3. Devolve resumo { collected: [...], failed: [...] } pro caller logar

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  fetchBcbPtax,
  fetchCepeaArabica,
  fetchCepeaOfficial,
  fetchIceArabica,
  fetchIceRobusta,
  type Quote,
} from "./_lib/adapters.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? null;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// CEPEA tem 2 caminhos: API oficial (quando contratada) e scraping fallback.
// Oficial vence se retornar valor; cai pro scraping só se oficial retornar null
// (sem credenciais OU erro). Mantém PK (source, symbol) = 'cepea_esalq' única
// na tabela — quem grava primeiro determina o source_url/meta.
async function fetchCepea(): Promise<Quote | null> {
  const official = await fetchCepeaOfficial();
  if (official) return official;
  return fetchCepeaArabica();
}

const ADAPTERS: Array<{ name: string; run: () => Promise<Quote | null> }> = [
  { name: "cepea", run: fetchCepea },
  { name: "ice_arabica", run: fetchIceArabica },
  { name: "ice_robusta", run: fetchIceRobusta },
  { name: "bcb_ptax", run: fetchBcbPtax },
];

async function syncAll() {
  const results = await Promise.allSettled(ADAPTERS.map((a) => a.run()));

  const collected: string[] = [];
  const failed: Array<{ adapter: string; error: string }> = [];

  for (let i = 0; i < results.length; i++) {
    const adapter = ADAPTERS[i].name;
    const r = results[i];

    if (r.status === "rejected") {
      failed.push({ adapter, error: String(r.reason?.message ?? r.reason) });
      continue;
    }
    if (!r.value) {
      failed.push({ adapter, error: "null_result" });
      continue;
    }

    const q = r.value;
    const { error } = await supabase.from("market_quotes").upsert(
      {
        source: q.source,
        symbol: q.symbol,
        price_brl_cents: q.price_brl_cents ?? null,
        price_usd_cents: q.price_usd_cents ?? null,
        variation_pct: q.variation_pct ?? null,
        quoted_at: q.quoted_at,
        fetched_at: new Date().toISOString(),
        source_url: q.source_url ?? null,
        meta: q.meta ?? {},
      },
      { onConflict: "source,symbol" },
    );

    if (error) {
      failed.push({ adapter, error: `db_upsert_failed: ${error.message}` });
    } else {
      collected.push(`${q.source}/${q.symbol}`);
    }
  }

  return { collected, failed, ran_at: new Date().toISOString() };
}

Deno.serve(async (req) => {
  // pg_cron chama com header `x-cron-secret`. Invoke manual via CLI
  // chega autenticado com service-role JWT (sempre permitido).
  const isCron = CRON_SECRET && req.headers.get("x-cron-secret") === CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  const isServiceRole = auth.toLowerCase().startsWith("bearer ") &&
    auth.slice(7) === SERVICE_KEY;

  if (!isCron && !isServiceRole) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const summary = await syncAll();
    return new Response(JSON.stringify({ ok: true, ...summary }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
});
