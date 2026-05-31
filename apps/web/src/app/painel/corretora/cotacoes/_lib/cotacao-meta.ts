import type { CoffeeProcesso, CoffeeSpecie } from "@milsaca/types";
import type { StatusTone } from "@/components/status-badge";

/**
 * Meta PURA da tela de Cotações — só tipos, labels, ordens e helpers de
 * formatação. Sem `createClient` (server-only), pra poder ser importada
 * tanto pelo `page.tsx` (server) quanto pelo `cotacoes-view.tsx` (client).
 */

export type CotacaoRow = {
  id: string;
  coffee_type: string;
  specie: CoffeeSpecie | null;
  process: CoffeeProcesso | null;
  region: string | null;
  price: number;
  source: string | null;
  reference_date: string;
  created_at: string;
  variacao_pct: number | null;
  /** Data de referência da cotação usada como base da variação (a "anterior"). */
  variacao_base: string | null;
  /**
   * `true` na cotação mais recente de cada combinação café+processo+praça —
   * é ESTA que o produtor vê hoje no painel dele. As demais são histórico.
   */
  vigente: boolean;
};

export type CotacoesFilter = {
  specie?: CoffeeSpecie;
  process?: CoffeeProcesso;
};

export const SPECIE_LABEL: Record<CoffeeSpecie, string> = {
  arabica: "Arábica",
  conillon: "Conillón",
};

export const PROCESS_LABEL: Record<CoffeeProcesso, string> = {
  natural: "Natural",
  cereja_descascado: "Cereja descascado",
  cd_desmucilado: "CD desmucilado",
  despolpado: "Despolpado",
  fermentacao_induzida: "Fermentação induzida",
};

export const SPECIE_ORDER: readonly CoffeeSpecie[] = ["arabica", "conillon"];

export const PROCESS_ORDER: readonly CoffeeProcesso[] = [
  "natural",
  "cereja_descascado",
  "cd_desmucilado",
  "despolpado",
  "fermentacao_induzida",
];

/** Filtros de espécie (incluindo "Todas") — usado nas pills e no FilterSheet. */
export const SPECIE_FILTERS: { value: "" | CoffeeSpecie; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "arabica", label: "Arábica" },
  { value: "conillon", label: "Conillón" },
];

export const PROCESS_FILTERS: { value: "" | CoffeeProcesso; label: string }[] = [
  { value: "", label: "Todos" },
  ...PROCESS_ORDER.map((p) => ({ value: p, label: PROCESS_LABEL[p] })),
];

/** Tom do badge de espécie — arábica dourado (premium), conillón info. */
export const SPECIE_TONE: Record<CoffeeSpecie, StatusTone> = {
  arabica: "premium",
  conillon: "info",
};

export function isSpecie(v: string | undefined): v is CoffeeSpecie {
  return v === "arabica" || v === "conillon";
}

export function isProcess(v: string | undefined): v is CoffeeProcesso {
  return (PROCESS_ORDER as readonly string[]).includes(v ?? "");
}

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

export function formatBRL(value: number): string {
  return BRL.format(value);
}

/** iso 'YYYY-MM-DD' (date col) — evita criar Date com timezone. */
export function formatDate(iso: string): string {
  const [y = "", m = "", d = ""] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Versão curta DD/MM/AA pra colunas/cards apertados. */
export function formatDateShort(iso: string): string {
  const [y = "", m = "", d = ""] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

export function cotacaoLabel(c: Pick<CotacaoRow, "specie" | "coffee_type">): string {
  return c.specie ? SPECIE_LABEL[c.specie] : c.coffee_type;
}

/** Chave que define uma "praça" de preço — café+processo+praça. */
export function cotacaoKey(
  c: Pick<CotacaoRow, "specie" | "coffee_type" | "process" | "region">,
): string {
  return [c.specie ?? c.coffee_type, c.process ?? "", c.region ?? ""].join("|");
}

/**
 * Distingue preço PRÓPRIO da corretora ("Manual") de um preço que apenas
 * USA uma fonte externa como referência ("ref. CEPEA"). Pro produtor que
 * recebe o dado, saber se é praça real da corretora ou eco do CEPEA importa.
 */
export function fonteLabel(source: string | null): { text: string; isRef: boolean } {
  const s = (source ?? "").trim();
  if (!s || /^manual$/i.test(s)) return { text: "Manual", isRef: false };
  return { text: `ref. ${s}`, isRef: true };
}
