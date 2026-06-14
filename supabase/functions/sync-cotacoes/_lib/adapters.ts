// Adapters de fontes externas portados do Kavita (kavita-backend/services/cotacoes/).
//
// REGRA DE OURO: nunca inventar preço. Se a fonte falhar ou o payload
// vier inesperado, retornar null. Quem orquestra (index.ts) faz upsert
// só do que respondeu, e logs do que falhou.
//
// Cada adapter devolve uma Quote no shape:
//   {
//     source: string,            // chave da tabela market_quotes
//     symbol: string,
//     price_brl_cents?: number,  // bigint friendly (centavos BRL)
//     price_usd_cents?: number,  // US cents (lb) ou USD×100 (ton)
//     variation_pct?: number,    // % vs dia anterior
//     quoted_at: string,         // ISO 8601 da fonte
//     source_url?: string,
//     meta?: Record<string, unknown>,
//   }

import { log, safeError } from "../../_shared/log.ts";

export interface Quote {
  source: string;
  symbol: string;
  price_brl_cents?: number | null;
  price_usd_cents?: number | null;
  variation_pct?: number | null;
  quoted_at: string;
  source_url?: string | null;
  meta?: Record<string, unknown> | null;
}

const UA =
  "MilsacaBot/1.0 (+https://milsaca.com.br; milsaca2026@gmail.com) cotacao-cache-15min";

/**
 * fetch com timeout por tentativa (8s) + retry/backoff para falhas
 * transitórias (erro de rede ou HTTP 5xx). Faz até 3 tentativas com
 * backoff exponencial (250ms, 500ms) + jitter.
 *
 * Não retenta 4xx (erro do cliente/payload) — só rede e 5xx. Mantém a
 * REGRA DE OURO: se mesmo após os retries a fonte falhar, o adapter que
 * chamou trata o resultado (res.ok === false → retorna null), nunca
 * inventa preço.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number; retries?: number } = {},
): Promise<Response> {
  const { timeoutMs = 8000, retries = 2, ...rest } = init;
  const maxAttempts = Math.max(1, retries + 1);
  let lastErr: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...rest, signal: ctrl.signal });
      // 5xx é transitório (gateway/origem instável) → vale retentar.
      // 4xx é definitivo → devolve pro caller decidir (sem retry).
      if (res.status >= 500 && attempt < maxAttempts - 1) {
        lastErr = new Error(`HTTP ${res.status}`);
        log.warn("fetch_retry", { url, attempt, status: res.status });
        continue;
      }
      return res;
    } catch (err) {
      // Erro de rede ou abort por timeout → retenta enquanto houver tentativa.
      lastErr = err;
      if (attempt >= maxAttempts - 1) break;
      log.warn("fetch_retry", { url, attempt, err: safeError(err) });
    } finally {
      clearTimeout(t);
    }

    // Backoff exponencial + jitter antes da próxima tentativa.
    const backoff = 250 * 2 ** attempt + Math.floor(Math.random() * 100);
    await new Promise((r) => setTimeout(r, backoff));
  }

  const finalErr = lastErr ?? new Error(`fetchWithTimeout falhou: ${url}`);
  log.warn("fetch_falhou", { url, attempts: maxAttempts, err: safeError(finalErr) });
  throw finalErr;
}

// ---------------------------------------------------------------------------
// 1) ICE "C" arábica (NY) — Yahoo Chart API v8
//    Fonte testada no Kavita (services/cotacoes/iceAdapter.js).
//    JSON público, sem auth, mais estável que Stooq desde 2025.
// ---------------------------------------------------------------------------
export async function fetchIceArabica(): Promise<Quote | null> {
  const url =
    "https://query1.finance.yahoo.com/v8/finance/chart/KC=F?interval=1d&range=5d";
  const res = await fetchWithTimeout(url, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    log.warn("fetch_nao_ok", { url, status: res.status });
    return null;
  }

  const body = await res.json().catch(() => null);
  const meta = body?.chart?.result?.[0]?.meta;
  if (!meta) return null;

  let price = Number(meta.regularMarketPrice);
  let prevClose = Number(meta.chartPreviousClose);
  if (!Number.isFinite(price) || price <= 0) return null;

  // Sanidade de unidade: Yahoo normalmente cota o KC=F em US cents/lb
  // (currency 'USX' / 'USc'). Se vier 'USD' (dólares/lb, ~2 ordens de
  // grandeza menor), convertemos ×100 (price e prevClose, pra manter a
  // mesma unidade). Qualquer outra moeda é inesperada → REGRA DE OURO:
  // retorna null em vez de inventar/aceitar errado.
  const currency = String(meta.currency ?? "").toUpperCase();
  if (currency === "USD") {
    price = price * 100; // USD/lb → US cents/lb
    if (Number.isFinite(prevClose)) prevClose = prevClose * 100;
  } else if (currency && currency !== "USX" && currency !== "USC") {
    log.warn("ice_currency_inesperada", { currency, price });
    return null;
  }

  // Faixa de sanidade pra arábica ICE NY (KC): ~50 a 600 US cents/lb.
  // Fora disso o payload está corrompido/em outra unidade → null.
  if (price < 50 || price > 600) {
    log.warn("ice_preco_fora_faixa", { price, currency });
    return null;
  }

  // Aqui price já está normalizado em US cents/lb.
  const priceCents = Math.round(price);
  const variation =
    Number.isFinite(prevClose) && prevClose > 0
      ? Number((((price - prevClose) / prevClose) * 100).toFixed(2))
      : null;

  const ts = Number(meta.regularMarketTime) * 1000;
  const quotedAt = Number.isFinite(ts)
    ? new Date(ts).toISOString()
    : new Date().toISOString();

  return {
    source: "ice_us",
    symbol: "KC.F",
    price_usd_cents: priceCents,
    variation_pct: variation,
    quoted_at: quotedAt,
    source_url: "https://finance.yahoo.com/quote/KC%3DF",
    meta: {
      contract: meta.shortName ?? "KC front",
      exchange: meta.exchangeName ?? "ICE",
      unit: "US cents/lb",
      raw_price: price,
    },
  };
}

// ---------------------------------------------------------------------------
// 2) Robusta (London ICE Europe) — Stooq RC.F
//    Stooq exige apikey em alguns símbolos desde 2025, mas RC.F via
//    CSV "quote" ainda funciona sem chave (testado no Kavita).
// ---------------------------------------------------------------------------
function parseStooqQuote(csv: string): { date: string; close: number } | null {
  const raw = csv?.trim();
  if (!raw || raw.toLowerCase().includes("no data") || raw.startsWith("<"))
    return null;
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const header = lines[0].toLowerCase().split(",");
  const idxDate = header.indexOf("date");
  const idxTime = header.indexOf("time");
  const idxClose = header.indexOf("close");
  if (idxClose < 0) return null;

  const row = lines[1].split(",");
  const date = idxDate >= 0 ? row[idxDate] : null;
  const time = idxTime >= 0 ? row[idxTime] : null;
  const close = Number(String(row[idxClose] ?? "").replace(",", "."));
  if (!Number.isFinite(close)) return null;

  return {
    date: date && time ? `${date} ${time}` : date ?? new Date().toISOString(),
    close,
  };
}

export async function fetchIceRobusta(): Promise<Quote | null> {
  // f=sd2t2ohlcv → Symbol,Date,Time,Open,High,Low,Close,Volume
  const urls = [
    "https://stooq.com/q/l/?s=rc.f&f=sd2t2ohlcv&h&e=csv",
    "https://stooq.pl/q/l/?s=rc.f&f=sd2t2ohlcv&h&e=csv",
  ];
  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, {
        headers: { "User-Agent": UA, Accept: "text/csv" },
      });
      if (!res.ok) {
        log.warn("fetch_nao_ok", { url, status: res.status });
        continue;
      }
      const csv = await res.text();
      const parsed = parseStooqQuote(csv);
      if (!parsed) {
        log.warn("stooq_parse_vazio", { url });
        continue;
      }

      // Robusta é cotado em USD/ton (não centavos). Guardamos × 100 pra
      // ficar inteiro (price_usd_cents é "USD × 100" — meta.unit deixa
      // claro).
      const cents = Math.round(parsed.close * 100);
      const quotedAt = new Date(parsed.date.replace(" ", "T") + "Z")
        .toISOString();

      return {
        source: "ice_eu",
        symbol: "RC.F",
        price_usd_cents: cents,
        variation_pct: null,
        quoted_at: Number.isFinite(new Date(quotedAt).getTime())
          ? quotedAt
          : new Date().toISOString(),
        source_url: url,
        meta: {
          contract: "Robusta C front (LIFFE)",
          exchange: "ICE Europe",
          unit: "USD/ton",
          raw_price: parsed.close,
        },
      };
    } catch (err) {
      // Loga antes de tentar o próximo mirror (não engole mais o erro).
      log.warn("stooq_mirror_falhou", { url, err: safeError(err) });
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 3) BCB PTAX — USD/BRL oficial
//    Endpoint OData, sem auth, traz o último D útil.
// ---------------------------------------------------------------------------
function bcbMDY(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}-${d.getFullYear()}`;
}

export async function fetchBcbPtax(): Promise<Quote | null> {
  const base =
    "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo";
  const today = new Date();
  const start = new Date(today.getTime() - 10 * 86400 * 1000);
  const url =
    `${base}(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)` +
    `?@dataInicial='${bcbMDY(start)}'&@dataFinalCotacao='${bcbMDY(today)}'&$format=json`;

  const res = await fetchWithTimeout(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
  });
  if (!res.ok) {
    log.warn("fetch_nao_ok", { url, status: res.status });
    return null;
  }

  const json = await res.json().catch(() => null);
  const arr = Array.isArray(json?.value) ? json.value : [];
  if (arr.length === 0) return null;

  const last = arr[arr.length - 1];
  const sell = Number(last.cotacaoVenda ?? last.cotacaoCompra ?? NaN);
  if (!Number.isFinite(sell)) return null;

  const quotedAt = last.dataHoraCotacao
    ? new Date(last.dataHoraCotacao).toISOString()
    : new Date().toISOString();

  return {
    source: "bcb_ptax",
    symbol: "USDBRL",
    price_brl_cents: Math.round(sell * 100),
    variation_pct: null,
    quoted_at: quotedAt,
    source_url: "https://www.bcb.gov.br/estabilidadefinanceira/historicocotacoes",
    meta: {
      bid: Number(last.cotacaoCompra) || null,
      ask: Number(last.cotacaoVenda) || null,
      unit: "BRL/USD",
      raw_price: sell,
    },
  };
}

// ---------------------------------------------------------------------------
// 4) Arábica CEPEA — API OFICIAL (preferida quando contratada)
//
//    Ativa via env vars (Supabase Edge secrets):
//      CEPEA_API_URL    — endpoint base, ex. https://api.cepea.esalq.usp.br/v1
//      CEPEA_API_TOKEN  — Bearer token recebido na contratação
//      CEPEA_INDICATOR  — ID do indicador (default: "cafe-arabica")
//
//    Sem essas envs, retorna null e o `cepea_scraping` (fallback abaixo) cuida.
//    Quando recebermos a doc real CEPEA, ajustar:
//      - URL do endpoint diário do indicador (formato JSON esperado)
//      - Campos do response: valor BRL, data de referência, variação
//      - Headers de auth (Bearer vs API Key)
//
//    Mantém a REGRA DE OURO: se o response vier inesperado, retorna null
//    (orchestrator não insere preço chutado).
// ---------------------------------------------------------------------------
export async function fetchCepeaOfficial(): Promise<Quote | null> {
  const baseUrl = Deno.env.get("CEPEA_API_URL");
  const token = Deno.env.get("CEPEA_API_TOKEN");
  const indicator = Deno.env.get("CEPEA_INDICATOR") ?? "cafe-arabica";

  if (!baseUrl || !token) return null; // não contratada ainda — usa scraping

  // TODO(quando-receber-doc-cepea): substituir path + parser pelos campos
  // reais da resposta da API oficial. Mantém o shape Quote e a faixa de
  // sanidade R$ 500–5000.
  const url = `${baseUrl.replace(/\/$/, "")}/indicadores/${indicator}/atual`;

  let res: Response;
  try {
    res = await fetchWithTimeout(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": UA,
      },
    });
  } catch (err) {
    log.warn("cepea_oficial_fetch_falhou", { url, err: safeError(err) });
    return null;
  }
  if (!res.ok) {
    log.warn("fetch_nao_ok", { url, status: res.status });
    return null;
  }

  const body = await res.json().catch(() => null);
  if (!body || typeof body !== "object") return null;

  // Esperado (ajustar conforme doc CEPEA real):
  //   { valor_brl: 1804.50, data_referencia: "2026-05-16", variacao_pct: 0.32 }
  const rawPrice = Number(
    (body as Record<string, unknown>).valor_brl ??
      (body as Record<string, unknown>).valor ??
      NaN,
  );
  const refDate = String(
    (body as Record<string, unknown>).data_referencia ??
      (body as Record<string, unknown>).data ??
      "",
  );
  const variation = Number(
    (body as Record<string, unknown>).variacao_pct ?? NaN,
  );

  if (!Number.isFinite(rawPrice) || rawPrice < 500 || rawPrice > 5000) {
    return null; // sanity: scraping também usa essa faixa
  }

  const quotedAt = refDate
    ? new Date(refDate + "T00:00:00Z").toISOString()
    : new Date().toISOString();

  return {
    source: "cepea_esalq",
    symbol: "arabica_bica_corrida_esalq",
    price_brl_cents: Math.round(rawPrice * 100),
    variation_pct: Number.isFinite(variation) ? variation : null,
    quoted_at: quotedAt,
    source_url: url,
    meta: {
      provider_chain: "cepea_api_oficial",
      unit: "BRL/saca-60kg",
      raw_price: rawPrice,
      indicator,
    },
  };
}

// ---------------------------------------------------------------------------
// 5) Arábica CEPEA via Notícias Agrícolas (SCRAPING — fallback)
//    Portado de kavita-backend/services/cotacoes/noticiasAgricolasAdapter.js.
//    Parser de 2 níveis: tabela estruturada → fallback regex tolerante.
//    Sanity check: faixa R$ 500–5000/saca pra não capturar propaganda.
//
//    Usado quando `cepea_official` retorna null (sem credenciais ou erro).
//    Marcar pra remover depois que a API oficial estiver estável em produção
//    por algumas semanas.
// ---------------------------------------------------------------------------
export async function fetchCepeaArabica(): Promise<Quote | null> {
  return fetchCepeaPageNoticias({
    url: "https://www.noticiasagricolas.com.br/cotacoes/cafe/indicador-cepea-esalq-cafe-arabica",
    symbol: "arabica_bica_corrida_esalq",
    sanityMin: 800,
    sanityMax: 5000,
    // Arábica formato: "1.604,50" (4 dígitos com ponto)
    pricePattern: /(\d{1,2}\.\d{3},\d{2})/g,
    // Pula até <tbody>, depois pega o segundo <td> da primeira <tr> (1º é data)
    tablePattern:
      /Valor\s+R\$[\s\S]*?<tbody[\s\S]*?<tr[\s\S]*?<td[^>]*>\s*\d{1,2}\/\d{1,2}\/\d{4}\s*<\/td>\s*<td[^>]*>\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*<\/td>/i,
  });
}

// ---------------------------------------------------------------------------
// 6) Conilon CEPEA ES via Notícias Agrícolas (SCRAPING)
//    Mesmo motor de scraping, URL e faixa de sanidade diferentes (Conilon
//    custa ~50-60% do Arábica BR).
// ---------------------------------------------------------------------------
export async function fetchCepeaConilon(): Promise<Quote | null> {
  return fetchCepeaPageNoticias({
    url: "https://www.noticiasagricolas.com.br/cotacoes/cafe/indicador-cepea-esalq-cafe-conillon",
    symbol: "conilon_es_esalq",
    sanityMin: 500,
    sanityMax: 2500,
    // Conilon pode aparecer como "921,88" (sem ponto de milhar) ou "1.234,56"
    pricePattern: /(\d{1,3}(?:\.\d{3})*,\d{2})/g,
    // Pula até <tbody>, depois pega o segundo <td> da primeira <tr> (1º é data)
    tablePattern:
      /Valor\s+R\$[\s\S]*?<tbody[\s\S]*?<tr[\s\S]*?<td[^>]*>\s*\d{1,2}\/\d{1,2}\/\d{4}\s*<\/td>\s*<td[^>]*>\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*<\/td>/i,
  });
}

interface CepeaScrapeSpec {
  url: string;
  symbol: string;
  sanityMin: number;
  sanityMax: number;
  pricePattern: RegExp;
  tablePattern: RegExp;
}

async function fetchCepeaPageNoticias(
  spec: CepeaScrapeSpec,
): Promise<Quote | null> {
  const res = await fetchWithTimeout(spec.url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    redirect: "follow",
  });
  if (!res.ok) {
    log.warn("fetch_nao_ok", { url: spec.url, status: res.status });
    return null;
  }
  const html = await res.text();

  let priceReais: number | null = null;

  const tableMatch = html.match(spec.tablePattern);
  if (tableMatch) {
    priceReais = parseFloat(tableMatch[1].replace(/\./g, "").replace(",", "."));
  }

  if (
    !Number.isFinite(priceReais) ||
    priceReais! < spec.sanityMin ||
    priceReais! > spec.sanityMax
  ) {
    const all = html.match(spec.pricePattern) ?? [];
    for (const m of all) {
      const v = parseFloat(m.replace(/\./g, "").replace(",", "."));
      if (v >= spec.sanityMin && v <= spec.sanityMax) {
        priceReais = v;
        break;
      }
    }
  }

  if (
    !Number.isFinite(priceReais) ||
    priceReais! < spec.sanityMin ||
    priceReais! > spec.sanityMax
  ) {
    return null;
  }

  const varMatch =
    html.match(/\(\s*([+-]?\d+[.,]\d+)\s*%\s*\)/) ??
    html.match(/Var[^<]*?([+-]?\d+[.,]\d+)\s*%/i);
  const variation =
    varMatch && Number.isFinite(parseFloat(varMatch[1].replace(",", ".")))
      ? parseFloat(varMatch[1].replace(",", "."))
      : null;

  return {
    source: "cepea_esalq",
    symbol: spec.symbol,
    price_brl_cents: Math.round(priceReais! * 100),
    variation_pct: variation,
    quoted_at: new Date().toISOString(),
    source_url: spec.url,
    meta: {
      provider_chain: "noticias_agricolas",
      unit: "BRL/saca-60kg",
      raw_price: priceReais,
    },
  };
}
