/**
 * @milsaca/cob — implementa a classificação oficial brasileira (COB)
 * conforme Instrução Normativa MAPA nº 8 de 11/06/2003.
 *
 * O domínio é estável: a IN não muda há 23 anos. As funções aqui
 * são puras (sem I/O), determinísticas e testáveis isoladamente.
 *
 * O `schema_version` exportado é gravado em cada laudo para
 * permitir reprocessamento futuro caso o algoritmo evolua.
 */

export const SCHEMA_VERSION = 1;

export type CoffeeType = "arabica" | "conillon";

export type Especie = CoffeeType;

/**
 * Bebida — escala oficial da IN.
 * Arábica e conillón usam escalas diferentes.
 */
export type BebidaArabica =
  | "estritamente_mole"
  | "mole"
  | "apenas_mole"
  | "duro"
  | "riado"
  | "rio"
  | "rio_zona";

export type BebidaConillon = "excelente" | "boa" | "regular" | "anormal";

export type Bebida = BebidaArabica | BebidaConillon;

/**
 * Cor (classe) — 8 níveis oficiais.
 */
export type Classe =
  | "verde_azulado"
  | "verde_cana"
  | "verde"
  | "amarelada"
  | "amarela"
  | "marrom"
  | "esbranquicada"
  | "chumbado"
  | "discrepante";

export type Aspecto = "bom" | "regular" | "mau";

export type Processo =
  | "natural"
  | "cereja_descascado"
  | "cd_desmucilado"
  | "despolpado"
  | "fermentacao_induzida";

// =================================================================
// Defeitos
// =================================================================

/**
 * Defeitos intrínsecos — observados nos próprios grãos de café.
 * Quantidades em GRÃOS contados em 300 g (amostra oficial).
 */
export interface DefeitosIntrinsecos {
  pretos: number;
  ardidos: number;
  preto_verdes: number;
  conchas: number;
  verdes: number;
  quebrados: number;
  brocados: number;
  mal_granados: number;
  esmagados?: number;
  miolo_concha?: number;
}

/**
 * Defeitos extrínsecos — matérias estranhas e impurezas.
 * Quantidades em UNIDADES.
 */
export interface DefeitosExtrinsecos {
  cocos?: number;
  marinheiros?: number;
  pau_pedra_torrao_grande?: number;
  pau_pedra_torrao_regular?: number;
  pau_pedra_torrao_pequeno?: number;
  cascas_grandes?: number;
  cascas_pequenas?: number;
}

export interface DefeitosCrus {
  intrinsecos: DefeitosIntrinsecos;
  extrinsecos?: DefeitosExtrinsecos;
}

/**
 * Configuração da contagem de brocados (2 a 5 grãos = 1 defeito).
 * Padrão SENAR (mediana): 3.
 * Corretoras conservadoras usam 2.
 * Corretoras permissivas usam 5.
 */
export interface OpcoesCalculo {
  brocadosPorDefeito?: 2 | 3 | 4 | 5;
}

const PADROES: Required<OpcoesCalculo> = {
  brocadosPorDefeito: 3,
};

// =================================================================
// Tabelas da IN
// =================================================================

/**
 * Equivalência intrínseca (item 16.1 da IN 8/2003):
 * QTD grãos observados : 1 defeito.
 */
const EQUIV_INTRINSECA = {
  pretos: 1,
  ardidos: 2,
  preto_verdes: 2, // equiparado ao ardido
  conchas: 3,
  verdes: 5,
  quebrados: 5,
  mal_granados: 5,
  esmagados: 5,
  miolo_concha: 5,
  // brocados: parametrizável (default 3)
} as const;

/**
 * Equivalência extrínsecas (item 16.2) — UM unidade desse defeito
 * vale N defeitos.
 */
const EQUIV_EXTRINSECA = {
  cocos: 1,
  marinheiros: 0.5, // 2 marinheiros = 1 defeito
  pau_pedra_torrao_grande: 5,
  pau_pedra_torrao_regular: 2,
  pau_pedra_torrao_pequeno: 1,
  cascas_grandes: 1,
  cascas_pequenas: 0.4, // ~2 a 3 cascas pequenas = 1 defeito (usamos 2,5)
} as const;

/**
 * Tabela 3 da IN — Defeitos → Tipo.
 * Cada tipo "cheio" tem um limite máximo de defeitos.
 * Entre os tipos cheios existem intermediários (4-25, 4-20, ...).
 *
 * Pontuação: Tipo 4 (26 defeitos) é base zero.
 * Tipo 2 vale +100; Tipo 8 vale -200.
 */
export interface TipoInfo {
  /** Identificador "cheio" ou intermediário, como "4", "4-25", "6-15". */
  tipo: string;
  /** Limite máximo (inclusive) de defeitos para esse tipo. */
  limite: number;
  /** Pontuação relativa ao Tipo 4 (=0). */
  pontuacao: number;
}

/**
 * Lista completa em ordem crescente de defeitos.
 * O cálculo escolhe o primeiro cujo limite >= total de defeitos.
 *
 * Intermediários: entre tipos cheios, em incrementos de 5 defeitos,
 * a IN reconhece "tipo-decimo" ex: 4-5, 4-10, 4-15, 4-20, 4-25
 * (lê-se "tipo 4 menos N décimos" — mais defeitos, pior).
 */
export const TABELA_TIPO: TipoInfo[] = [
  { tipo: "2", limite: 4, pontuacao: 100 },
  { tipo: "2-5", limite: 5, pontuacao: 90 },
  { tipo: "2-10", limite: 6, pontuacao: 80 },
  { tipo: "2-15", limite: 7, pontuacao: 70 },
  { tipo: "2-20", limite: 8, pontuacao: 60 },
  { tipo: "2-25", limite: 9, pontuacao: 50 },
  { tipo: "3", limite: 12, pontuacao: 40 },
  { tipo: "3-5", limite: 14, pontuacao: 30 },
  { tipo: "3-10", limite: 17, pontuacao: 20 },
  { tipo: "3-15", limite: 20, pontuacao: 10 },
  { tipo: "3-20", limite: 23, pontuacao: 5 },
  { tipo: "4", limite: 26, pontuacao: 0 },
  { tipo: "4-5", limite: 30, pontuacao: -5 },
  { tipo: "4-10", limite: 34, pontuacao: -10 },
  { tipo: "4-15", limite: 38, pontuacao: -15 },
  { tipo: "4-20", limite: 42, pontuacao: -20 },
  { tipo: "4-25", limite: 45, pontuacao: -25 },
  { tipo: "5", limite: 46, pontuacao: -30 },
  { tipo: "5-5", limite: 53, pontuacao: -35 },
  { tipo: "5-10", limite: 60, pontuacao: -40 },
  { tipo: "5-15", limite: 67, pontuacao: -45 },
  { tipo: "5-20", limite: 74, pontuacao: -50 },
  { tipo: "5-25", limite: 81, pontuacao: -55 },
  { tipo: "6", limite: 86, pontuacao: -60 },
  { tipo: "6-5", limite: 100, pontuacao: -70 },
  { tipo: "6-10", limite: 115, pontuacao: -80 },
  { tipo: "6-15", limite: 130, pontuacao: -90 },
  { tipo: "6-20", limite: 145, pontuacao: -100 },
  { tipo: "7", limite: 160, pontuacao: -110 },
  { tipo: "7-5", limite: 200, pontuacao: -130 },
  { tipo: "7-10", limite: 240, pontuacao: -150 },
  { tipo: "7-15", limite: 280, pontuacao: -170 },
  { tipo: "7-20", limite: 320, pontuacao: -190 },
  { tipo: "8", limite: 360, pontuacao: -200 },
];

// =================================================================
// Cálculo
// =================================================================

export interface ResultadoCob {
  /** Total de defeitos consolidado (intrínsecos + extrínsecos). */
  total_defeitos: number;
  /** Tipo encontrado ("2", "4-25", "6", "8"...) ou null se fora de tipo. */
  tipo: string | null;
  /** Pontuação relativa ao Tipo 4 (=0); null se fora de tipo. */
  pontuacao: number | null;
  /** Se true, café não pode ser comercializado — só rebenefício. */
  fora_de_tipo: boolean;
  /** Razões específicas (OR lógico) que dispararam o Fora de Tipo. */
  fora_de_tipo_motivos: string[];
  /** Detalhamento de como o total foi calculado. */
  breakdown: {
    intrinsecos: Record<string, number>;
    extrinsecos: Record<string, number>;
    /** Defeitos contados excluindo (quebrados, mal_granados, conchas,
     *  miolo_concha, brocados) — usado na regra de Fora de Tipo. */
    total_excluindo_leves: number;
  };
  /** Versão do algoritmo usada. Grave junto com o laudo. */
  schema_version: number;
}

/**
 * Calcula tipo e Fora de Tipo a partir dos defeitos crus.
 *
 * Premissa: a contagem já passou pela regra de prevalência da IN
 * (item 12.6.1) — cada grão é contado UMA vez pelo defeito mais
 * grave. O cliente desta função é responsável por isso na hora
 * da catação (ou seja, "pretos", "ardidos" etc. são exclusivos).
 */
export function calcularLaudo(
  cru: DefeitosCrus,
  opts: OpcoesCalculo = {},
): ResultadoCob {
  const cfg = { ...PADROES, ...opts };
  const i = cru.intrinsecos;
  const e = cru.extrinsecos ?? {};

  // 1) Defeitos intrínsecos
  const intrinsecosBreakdown: Record<string, number> = {
    pretos: i.pretos / EQUIV_INTRINSECA.pretos,
    ardidos: i.ardidos / EQUIV_INTRINSECA.ardidos,
    preto_verdes: i.preto_verdes / EQUIV_INTRINSECA.preto_verdes,
    conchas: i.conchas / EQUIV_INTRINSECA.conchas,
    verdes: i.verdes / EQUIV_INTRINSECA.verdes,
    quebrados: i.quebrados / EQUIV_INTRINSECA.quebrados,
    mal_granados: i.mal_granados / EQUIV_INTRINSECA.mal_granados,
    brocados: i.brocados / cfg.brocadosPorDefeito,
  };
  if (i.esmagados !== undefined) {
    intrinsecosBreakdown.esmagados = i.esmagados / EQUIV_INTRINSECA.esmagados;
  }
  if (i.miolo_concha !== undefined) {
    intrinsecosBreakdown.miolo_concha =
      i.miolo_concha / EQUIV_INTRINSECA.miolo_concha;
  }

  // 2) Defeitos extrínsecos
  const extrinsecosBreakdown: Record<string, number> = {};
  for (const key of Object.keys(EQUIV_EXTRINSECA) as Array<
    keyof typeof EQUIV_EXTRINSECA
  >) {
    const qtd = e[key] ?? 0;
    if (qtd > 0) {
      extrinsecosBreakdown[key] = qtd * EQUIV_EXTRINSECA[key];
    }
  }

  // 3) Soma total (todos defeitos viram número de "defeitos COB").
  // Truncamos para baixo no detalhe (não somar fração de defeito
  // que ainda não fechou). Convenção brasileira: defeitos sempre
  // inteiros — frações de equivalência são descartadas.
  const intrinsecos: Record<string, number> = {};
  for (const [k, v] of Object.entries(intrinsecosBreakdown)) {
    intrinsecos[k] = Math.floor(v);
  }
  const extrinsecos: Record<string, number> = {};
  for (const [k, v] of Object.entries(extrinsecosBreakdown)) {
    extrinsecos[k] = Math.floor(v);
  }

  const total =
    Object.values(intrinsecos).reduce((a, b) => a + b, 0) +
    Object.values(extrinsecos).reduce((a, b) => a + b, 0);

  // 4) Total excluindo defeitos "leves" (regra de Fora de Tipo)
  const leves: Array<keyof DefeitosIntrinsecos> = [
    "quebrados",
    "mal_granados",
    "conchas",
    "miolo_concha",
    "brocados",
  ];
  const totalExcluindoLeves =
    total -
    leves.reduce((acc, k) => acc + (intrinsecos[k] ?? 0), 0);

  // 5) Fora de Tipo — OR lógico das condições
  const motivos: string[] = [];
  if (i.pretos > 50) motivos.push(`> 50 grãos pretos (${i.pretos})`);
  if (i.ardidos > 100) motivos.push(`> 100 grãos ardidos (${i.ardidos})`);
  if (i.preto_verdes > 100)
    motivos.push(`> 100 grãos preto-verdes (${i.preto_verdes})`);
  if (totalExcluindoLeves > 300)
    motivos.push(
      `> 300 defeitos totais excluindo leves (${totalExcluindoLeves})`,
    );

  const fora_de_tipo = motivos.length > 0;

  // 6) Mapeia para Tipo (a menos que Fora de Tipo)
  let tipo: string | null = null;
  let pontuacao: number | null = null;
  if (!fora_de_tipo) {
    const found = TABELA_TIPO.find((t) => total <= t.limite);
    if (found) {
      tipo = found.tipo;
      pontuacao = found.pontuacao;
    } else {
      // Total > 360 mas não bateu as condições específicas de Fora de Tipo.
      // Convenção: vira Fora de Tipo extra-tabela.
      motivos.push(`Total de defeitos (${total}) excede o máximo da tabela`);
      return {
        total_defeitos: total,
        tipo: null,
        pontuacao: null,
        fora_de_tipo: true,
        fora_de_tipo_motivos: motivos,
        breakdown: {
          intrinsecos,
          extrinsecos,
          total_excluindo_leves: totalExcluindoLeves,
        },
        schema_version: SCHEMA_VERSION,
      };
    }
  }

  return {
    total_defeitos: total,
    tipo,
    pontuacao,
    fora_de_tipo,
    fora_de_tipo_motivos: motivos,
    breakdown: {
      intrinsecos,
      extrinsecos,
      total_excluindo_leves: totalExcluindoLeves,
    },
    schema_version: SCHEMA_VERSION,
  };
}

// =================================================================
// PVA (Preto, Verde, Ardido) — não normativo, mas universal
// =================================================================

/**
 * Calcula PVA (%) sobre uma amostra de 100 g.
 * Aceita os números de grãos contados em 100 g (não 300 g).
 *
 * Convenção: pegar a soma percentual desses 3 tipos de grãos.
 * Cafés Gourmet exigem PVA = 0%, Superior até 10%.
 */
export function calcularPVA(input: {
  pretos: number;
  verdes: number;
  ardidos: number;
  total_graos?: number; // padrão: assume 100 g ≈ ~600 grãos
}): number {
  const total = input.total_graos ?? 600;
  if (total <= 0) return 0;
  const soma = input.pretos + input.verdes + input.ardidos;
  return Number(((soma / total) * 100).toFixed(2));
}
