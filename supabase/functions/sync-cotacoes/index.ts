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
import * as Sentry from "https://esm.sh/@sentry/deno@8.45.1";
import {
  fetchBcbPtax,
  fetchCepeaArabica,
  fetchCepeaConilon,
  fetchCepeaOfficial,
  fetchIceArabica,
  // fetchIceRobusta removido: Stooq passou a exigir apikey em 2025 e
  // sempre retorna null. Reativar quando tivermos fonte alternativa
  // (CME, Investing.com via scraping, ou pagar a API).
  type Quote,
} from "./_lib/adapters.ts";
import { log, safeError } from "../_shared/log.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? null;

// Observabilidade: inicializa Sentry só se o secret SENTRY_DSN estiver setado
// (supabase secrets set SENTRY_DSN=...). Sem DSN é no-op total.
const SENTRY_DSN = Deno.env.get("SENTRY_DSN");
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

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
  { name: "cepea_arabica", run: fetchCepea },
  { name: "cepea_conilon", run: fetchCepeaConilon },
  { name: "ice_arabica", run: fetchIceArabica },
  // { name: "ice_robusta", run: fetchIceRobusta }, — desabilitado (ver import)
  { name: "bcb_ptax", run: fetchBcbPtax },
];

async function syncAll(runId: string) {
  const results = await Promise.allSettled(ADAPTERS.map((a) => a.run()));

  const collected: string[] = [];
  const failed: Array<{ adapter: string; error: string }> = [];

  for (let i = 0; i < results.length; i++) {
    const adapter = ADAPTERS[i].name;
    const r = results[i];

    if (r.status === "rejected") {
      const err = safeError(r.reason);
      failed.push({ adapter, error: err.message });
      log.warn("adapter_falhou", { runId, adapter, err });
      continue;
    }
    if (!r.value) {
      failed.push({ adapter, error: "null_result" });
      log.warn("adapter_falhou", { runId, adapter, err: { message: "null_result" } });
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
      // Falha de banco é problema nosso (não da fonte externa) → error + Sentry.
      log.error("db_upsert_failed", {
        runId,
        adapter,
        source: q.source,
        symbol: q.symbol,
        err: safeError(error),
      });
      if (SENTRY_DSN) Sentry.captureMessage("db_upsert_failed", "error");
    } else {
      collected.push(`${q.source}/${q.symbol}`);
    }
  }

  log.info("sync_done", {
    runId,
    collected: collected.length,
    failedCount: failed.length,
  });

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

  const runId = crypto.randomUUID();
  if (SENTRY_DSN) Sentry.setTag("run_id", runId);

  try {
    const summary = await syncAll(runId);
    return new Response(JSON.stringify({ ok: true, ...summary }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    log.error("sync_uncaught", { runId, err: safeError(err) });
    if (SENTRY_DSN) Sentry.captureException(err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
});
