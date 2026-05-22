#!/usr/bin/env node
/**
 * check-quotes-real — valida que o módulo de cotações só mostra dados
 * reais (mercado automático + manual de admin/corretora) e nenhum mock.
 *
 * Saída:
 *   OK    — fonte/cotação reais funcionando
 *   WARN  — fonte indisponível mas tratada honestamente (sem fake)
 *   FAIL  — mock/fallback/seed fake detectado na UI de produção
 *
 * Exit code:
 *   0 se sem FAIL
 *   1 se houver FAIL
 *
 * Uso:
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_xxx"
 *   node apps/web/scripts/check-quotes-real.mjs
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { spawn } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "..", ".env.local");
const repoRoot = resolve(here, "..", "..", "..");

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

const COLOR = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
};

let failures = 0;
let warnings = 0;
let okays = 0;

function ok(msg) {
  okays++;
  console.log(`${COLOR.green}OK${COLOR.reset}   ${msg}`);
}
function warn(msg) {
  warnings++;
  console.log(`${COLOR.yellow}WARN${COLOR.reset} ${msg}`);
}
function fail(msg) {
  failures++;
  console.log(`${COLOR.red}FAIL${COLOR.reset} ${msg}`);
}
function section(title) {
  console.log(`\n${COLOR.dim}── ${title} ──${COLOR.reset}`);
}

async function main() {
  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const token = process.env.SUPABASE_ACCESS_TOKEN ?? env.SUPABASE_ACCESS_TOKEN;
  if (!url || !token) {
    console.error("Faltando NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_ACCESS_TOKEN");
    process.exit(2);
  }
  const ref = url.replace(/^https?:\/\//, "").split(".")[0];

  async function q(sql) {
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
      const text = await r.text();
      throw new Error(`SQL falhou (${r.status}): ${text}`);
    }
    return r.json();
  }

  // ============================================================
  section("1. Modo de cotações");
  const quotesMode =
    process.env.QUOTES_MODE ??
    process.env.NEXT_PUBLIC_QUOTES_MODE ??
    "real";
  if (quotesMode === "real") {
    ok(`QUOTES_MODE=real (produção segura — sem mock permitido)`);
  } else {
    warn(`QUOTES_MODE=${quotesMode} — UI deve mostrar badge "Demonstração"`);
  }

  // ============================================================
  section("2. Cotações automáticas (market_quotes)");
  const market = await q(
    `select source, symbol, fetched_at,
            extract(epoch from (now() - fetched_at)) / 3600 as age_hours
       from public.market_quotes
       order by fetched_at desc;`,
  );

  const STALE_HRS = 36;
  const expectedSources = ["cepea_esalq", "ice_us", "bcb_ptax"];
  const seen = new Set();

  for (const row of market) {
    seen.add(row.source);
    const age = Number(row.age_hours);
    if (age <= STALE_HRS) {
      ok(`${row.source}/${row.symbol} — sincronizado há ${age.toFixed(1)}h`);
    } else {
      warn(
        `${row.source}/${row.symbol} — última sync há ${age.toFixed(1)}h (>${STALE_HRS}h)`,
      );
    }
  }
  for (const src of expectedSources) {
    if (!seen.has(src)) {
      warn(`${src} — sem nenhum snapshot em market_quotes ainda`);
    }
  }

  // ============================================================
  section("3. Status das fontes (quote_sources)");
  const sources = await q(
    `select slug, name, type, active, last_success_at, last_error_at, last_error_message
       from public.quote_sources
       order by type, slug;`,
  );
  for (const s of sources) {
    if (!s.active) {
      warn(`${s.slug} (${s.type}) — desativada${s.last_error_message ? `: ${s.last_error_message}` : ""}`);
    } else if (s.type === "automatic" && !s.last_success_at) {
      warn(`${s.slug} — automática mas sem last_success_at`);
    } else if (s.type === "automatic" && s.last_error_at && !s.last_success_at) {
      fail(`${s.slug} — automática falhando: ${s.last_error_message}`);
    } else {
      ok(`${s.slug} (${s.type}) — ativa${s.last_success_at ? `, último OK: ${s.last_success_at}` : ""}`);
    }
  }

  // ============================================================
  section("4. Cotações manuais (cotacoes)");
  const cots = await q(
    `select count(*) filter (where status = 'active') as ativas,
            count(*) filter (where status = 'stale') as stales,
            count(*) filter (where status = 'hidden') as hidden,
            count(*) filter (where corretora_id is null) as sem_corretora,
            count(*) as total
       from public.cotacoes;`,
  );
  const c = cots[0];
  if (c.total === 0) {
    warn(
      `0 cotações manuais — produtor verá só "Mercado". Admin/corretora precisa postar via UI.`,
    );
  } else {
    ok(`${c.total} cotações manuais (${c.ativas} ativas, ${c.stales} stale, ${c.hidden} hidden)`);
  }
  if (c.sem_corretora > 0) {
    fail(`${c.sem_corretora} cotações manuais SEM corretora_id (orfãs)`);
  } else {
    ok(`Todas as cotações manuais têm corretora_id (tenant válido)`);
  }

  // ============================================================
  section("5. Catálogos (coffee_types, pracas)");
  const types = await q(
    `select count(*) filter (where active) as ativos, count(*) as total from public.coffee_types;`,
  );
  if (types[0].ativos === 0) {
    fail(`Nenhum coffee_type ativo — admin não consegue postar cotação`);
  } else {
    ok(`${types[0].ativos}/${types[0].total} tipos de café ativos`);
  }
  const pracs = await q(
    `select count(*) filter (where active) as ativas, count(*) as total from public.pracas;`,
  );
  if (pracs[0].ativas === 0) {
    warn(`Nenhuma praça ativa`);
  } else {
    ok(`${pracs[0].ativas}/${pracs[0].total} praças ativas`);
  }

  // ============================================================
  section("6. Cron de cotações");
  const cron = await q(
    `select jobname, schedule, active
       from cron.job
       where jobname in ('milsaca-sync-cotacoes','milsaca-mark-stale-cotacoes','milsaca-check-price-targets')
       order by jobname;`,
  );
  const expectedJobs = {
    "milsaca-sync-cotacoes": "0 12,21 * * 1-5",
    "milsaca-mark-stale-cotacoes": "0 2 * * *",
    "milsaca-check-price-targets": "30 12,21 * * 1-5",
  };
  for (const [name, expected] of Object.entries(expectedJobs)) {
    const row = cron.find((r) => r.jobname === name);
    if (!row) {
      fail(`${name} — não encontrado no cron.job`);
    } else if (!row.active) {
      fail(`${name} — agendado mas INATIVO`);
    } else if (row.schedule !== expected) {
      warn(`${name} — schedule "${row.schedule}" (esperado "${expected}")`);
    } else {
      ok(`${name} — ${row.schedule}`);
    }
  }

  // ============================================================
  section("7. Mocks/seeds fake no código de produção");
  await checkGrep("apps/web/src", "mockQuotes|demoQuotes|fakeQuotes");

  // ============================================================
  section("8. Alertas de preço (price_alerts)");
  const alerts = await q(
    `select count(*) filter (where active) as ativos, count(*) as total
       from public.price_alerts;`,
  );
  if (alerts[0].total === 0) {
    warn(`0 alvos de preço cadastrados (esperado quando produtor ainda não usou)`);
  } else {
    ok(`${alerts[0].ativos}/${alerts[0].total} alvos ativos`);
  }

  // ============================================================
  console.log(
    `\n${COLOR.dim}──${COLOR.reset} Resumo: ${COLOR.green}${okays} OK${COLOR.reset} · ${COLOR.yellow}${warnings} WARN${COLOR.reset} · ${COLOR.red}${failures} FAIL${COLOR.reset}`,
  );

  if (failures > 0) {
    console.log(
      `\n${COLOR.red}✗${COLOR.reset} Há falhas críticas. Modo real NÃO está seguro.`,
    );
    process.exit(1);
  }
  console.log(
    `\n${COLOR.green}✓${COLOR.reset} Modo real validado. Nenhum mock detectado no código de produção.`,
  );
  if (warnings > 0) {
    console.log(
      `${COLOR.yellow}!${COLOR.reset} Warnings existem mas são esperados (fonte indisponível tratada honestamente OU dados ainda não cadastrados).`,
    );
  }
}

/** Grep cross-platform via ripgrep ou findstr. */
async function checkGrep(dir, pattern) {
  const absDir = join(repoRoot, dir.split("/").join(require_sep()));
  // Tenta ripgrep primeiro; cai pra Node implementation se falhar.
  const found = await tryRipgrep(absDir, pattern);
  if (found === null) {
    // Fallback: scan recursivo simples
    const files = await scanFiles(absDir);
    const regex = new RegExp(pattern);
    const hits = [];
    for (const f of files) {
      try {
        const text = await readFile(f, "utf8");
        if (regex.test(text)) hits.push(f);
      } catch {
        /* ignore */
      }
    }
    if (hits.length > 0) {
      fail(
        `Padrão "${pattern}" encontrado em produção: ${hits.length} arquivo(s)`,
      );
      for (const h of hits.slice(0, 5)) console.log(`     ${h}`);
    } else {
      ok(`Nenhum mock/seed/fake encontrado em ${dir} (padrão "${pattern}")`);
    }
    return;
  }
  if (found.length === 0) {
    ok(`Nenhum mock/seed/fake encontrado em ${dir} (padrão "${pattern}")`);
  } else {
    fail(`Padrão "${pattern}" encontrado em produção:`);
    for (const line of found.slice(0, 10)) console.log(`     ${line}`);
  }
}

function require_sep() {
  return process.platform === "win32" ? "\\" : "/";
}

async function tryRipgrep(dir, pattern) {
  return new Promise((res) => {
    try {
      const p = spawn("rg", ["-l", "-i", pattern, dir], { shell: false });
      const lines = [];
      p.stdout.on("data", (d) =>
        lines.push(...String(d).split(/\r?\n/).filter(Boolean)),
      );
      p.on("error", () => res(null));
      p.on("close", (code) => {
        if (code === 0 || code === 1) res(lines);
        else res(null);
      });
    } catch {
      res(null);
    }
  });
}

async function scanFiles(dir) {
  const { readdir, stat } = await import("node:fs/promises");
  const out = [];
  async function walk(d) {
    let entries;
    try {
      entries = await readdir(d);
    } catch {
      return;
    }
    for (const name of entries) {
      const p = join(d, name);
      let st;
      try {
        st = await stat(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        if (name === "node_modules" || name.startsWith(".")) continue;
        await walk(p);
      } else if (/\.(ts|tsx|mjs|js)$/.test(name)) {
        out.push(p);
      }
    }
  }
  await walk(dir);
  return out;
}

main().catch((e) => {
  console.error(`${COLOR.red}Erro fatal:${COLOR.reset}`, e.message);
  process.exit(2);
});
