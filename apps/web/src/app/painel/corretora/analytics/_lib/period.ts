/**
 * Período global do Analytics — PURO (client + server safe).
 *
 * O seletor escopa os KPIs de fluxo + funil + origem + mix + top compradores.
 * A comparação (delta) usa a janela ANTERIOR de MESMA duração, terminando no
 * início da janela atual — comparação honesta (mesmo tamanho de janela).
 *
 * Os gráficos de TENDÊNCIA (leads/mês 6m, comissão 12m) NÃO usam o período:
 * são a leitura de trajetória e ficam em janelas trailing fixas.
 */

export type Period = "este_mes" | "trimestre" | "ano" | "12m";

export const PERIODS: Period[] = ["este_mes", "trimestre", "ano", "12m"];

export const PERIOD_LABEL: Record<Period, string> = {
  este_mes: "Este mês",
  trimestre: "Trimestre",
  ano: "Este ano",
  "12m": "12 meses",
};

export const PERIOD_DEFAULT: Period = "este_mes";

export function isPeriod(v: unknown): v is Period {
  return typeof v === "string" && (PERIODS as string[]).includes(v);
}

export function parsePeriod(v: string | undefined): Period {
  return isPeriod(v) ? v : PERIOD_DEFAULT;
}

export type Range = {
  /** Início (inclusive). */
  start: Date;
  /** Fim (exclusivo) = agora. */
  end: Date;
  /** Início da janela anterior (mesma duração). */
  prevStart: Date;
  /** Fim da janela anterior = `start`. */
  prevEnd: Date;
  /** Rótulo do período atual. */
  label: string;
  /** Rótulo curto da comparação. */
  prevLabel: string;
};

/**
 * Resolve a janela [start, end=agora] do período + a janela anterior de mesma
 * duração. `nowMs` injetado pra manter SSR determinístico.
 */
export function resolveRange(period: Period, nowMs: number): Range {
  const end = new Date(nowMs);
  const y = end.getUTCFullYear();
  const m = end.getUTCMonth();
  let start: Date;
  switch (period) {
    case "este_mes":
      start = new Date(Date.UTC(y, m, 1));
      break;
    case "trimestre":
      start = new Date(Date.UTC(y, m - 2, 1));
      break;
    case "ano":
      start = new Date(Date.UTC(y, 0, 1));
      break;
    case "12m":
    default:
      start = new Date(Date.UTC(y, m - 11, 1));
      break;
  }
  const durMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime());
  const prevStart = new Date(start.getTime() - durMs);
  return {
    start,
    end,
    prevStart,
    prevEnd,
    label: PERIOD_LABEL[period],
    prevLabel: "vs. período anterior",
  };
}

// ---------------------------------------------------------------------------
// Delta vs período anterior
// ---------------------------------------------------------------------------

export type DeltaInfo = {
  label: string;
  direction: "up" | "down" | "flat";
  hint?: string;
};

/**
 * Calcula o delta percentual entre o valor atual e o anterior.
 * - prev 0 e curr 0 → flat "0%".
 * - prev 0 e curr > 0 → up "novo" (evita divisão por zero / +Infinity%).
 * - senão → percentual com sinal.
 */
export function computeDelta(
  curr: number,
  prev: number,
  hint?: string,
): DeltaInfo {
  if (prev === 0) {
    if (curr === 0) return { label: "0%", direction: "flat", hint };
    return { label: "novo", direction: "up", hint };
  }
  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  if (Math.abs(pct) < 0.5) return { label: "0%", direction: "flat", hint };
  const sign = pct > 0 ? "+" : "−";
  return {
    label: `${sign}${Math.abs(pct).toFixed(0)}%`,
    direction: pct > 0 ? "up" : "down",
    hint,
  };
}
