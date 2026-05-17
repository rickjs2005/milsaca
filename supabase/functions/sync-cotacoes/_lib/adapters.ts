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
  "MilsacaBot/1.0 (+https://milsaca.com.br; rickjanuario0@gmail.com) cotacao-cache-15min";

async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 8000, ...rest } = init;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
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
  if (!res.ok) return null;

  const body = await res.json().catch(() => null);
  const meta = body?.chart?.result?.[0]?.meta;
  if (!meta) return null;

  const price = Number(meta.regularMarketPrice);
  const prevClose = Number(meta.chartPreviousClose);
  if (!Number.isFinite(price) || price <= 0) return null;

  // Yahoo devolve regularMarketPrice já em US cents/lb (currency USX).
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
      if (!res.ok) continue;
      const csv = await res.text();
      const parsed = parseStooqQuote(csv);
      if (!parsed) continue;

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
    } catch {
      // tenta próximo mirror
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
  if (!res.ok) return null;

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
// 4) Arábica CEPEA via Notícias Agrícolas (scraping)
//    Portado de kavita-backend/services/cotacoes/noticiasAgricolasAdapter.js.
//    Parser de 2 níveis: tabela estruturada → fallback regex tolerante.
//    Sanity check: faixa R$ 500–5000/saca pra não capturar propaganda.
// ---------------------------------------------------------------------------
export async function fetchCepeaArabica(): Promise<Quote | null> {
  const url =
    "https://www.noticiasagricolas.com.br/cotacoes/cafe/indicador-cepea-esalq-cafe-arabica";
  const res = await fetchWithTimeout(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    redirect: "follow",
  });
  if (!res.ok) return null;
  const html = await res.text();

  let priceReais: number | null = null;

  // Nível 1 — tabela estruturada com <th>Valor R$</th><td>1.804,50</td>
  const tableMatch = html.match(
    /Valor\s+R\$[\s\S]{0,200}?<td[^>]*>\s*(\d{1,3}(?:\.\d{3})+,\d{2})\s*<\/td>/i,
  );
  if (tableMatch) {
    priceReais = parseFloat(tableMatch[1].replace(/\./g, "").replace(",", "."));
  }

  // Nível 2 — fallback tolerante com sanidade (R$ 500-5000)
  if (!Number.isFinite(priceReais) || priceReais! < 500 || priceReais! > 5000) {
    const all = html.match(/(\d{1,2}\.\d{3},\d{2})/g) ?? [];
    for (const m of all) {
      const v = parseFloat(m.replace(/\./g, "").replace(",", "."));
      if (v >= 500 && v <= 5000) {
        priceReais = v;
        break;
      }
    }
  }

  if (!Number.isFinite(priceReais) || priceReais! < 500 || priceReais! > 5000) {
    return null;
  }

  // Variação best-effort
  const varMatch =
    html.match(/\(\s*([+-]?\d+[.,]\d+)\s*%\s*\)/) ??
    html.match(/Var[^<]*?([+-]?\d+[.,]\d+)\s*%/i);
  const variation =
    varMatch && Number.isFinite(parseFloat(varMatch[1].replace(",", ".")))
      ? parseFloat(varMatch[1].replace(",", "."))
      : null;

  return {
    source: "cepea_esalq",
    symbol: "arabica_bica_corrida_esalq",
    price_brl_cents: Math.round(priceReais! * 100),
    variation_pct: variation,
    quoted_at: new Date().toISOString(),
    source_url: url,
    meta: {
      provider_chain: "noticias_agricolas",
      unit: "BRL/saca-60kg",
      raw_price: priceReais,
    },
  };
}
