/**
 * Conversão de unidades de café — fonte ÚNICA da verdade.
 *
 * Regra de negócio (ver `_Milsaca/20 - Tela do Produtor.md`):
 *   - kg é a medida física real → a FONTE DA VERDADE. Tudo deriva daqui.
 *   - saca = unidade de NEGÓCIO (preço, cotação, contrato, comissão). 1 saca = 60 kg.
 *   - bag/big bag = só EMBALAGEM/logística; peso varia (500/600/1.000 kg).
 *
 * Regra de ouro: converter SEMPRE passando por kg. Nunca tratar bag↔saca direto.
 * NUNCA arredondar no cálculo/persistência — só nas funções `formatar*` (exibição).
 *
 * Módulo de funções PURAS (sem React, sem side-effect). Nenhum componente deve
 * fazer `/ 60` ou `* 60` solto — tudo passa por aqui.
 */

export const KG_POR_SACA = 60;

export type Unidade = "saca" | "bag" | "kg";

// ===== Conversões puras (sem arredondamento) =====================

/** kg → sacas (preserva fração: 500 kg = 8,333… sacas). */
export const kgParaSacas = (kg: number): number => kg / KG_POR_SACA;

/** sacas → kg. */
export const sacasParaKg = (sacas: number): number => sacas * KG_POR_SACA;

/** qtd de bags × peso de cada bag → kg (é assim que a entrada em bag vira verdade). */
export const bagsParaKg = (qtdBags: number, pesoPorBagKg: number): number =>
  qtdBags * pesoPorBagKg;

/**
 * Converte um valor em kg para a unidade de EXIBIÇÃO escolhida.
 * Para 'bag' exige `pesoPorBagKg` (> 0); sem ele, retorna NaN (não dá pra inferir).
 */
export const kgParaUnidade = (
  kg: number,
  unidade: Unidade,
  pesoPorBagKg?: number,
): number => {
  switch (unidade) {
    case "kg":
      return kg;
    case "saca":
      return kgParaSacas(kg);
    case "bag":
      return pesoPorBagKg && pesoPorBagKg > 0 ? kg / pesoPorBagKg : NaN;
  }
};

// ===== Formatação pt-BR (ÚNICO lugar que arredonda) ==============

const nf = (maxFrac: number, minFrac = 0) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
  });

/**
 * "100 sacas" quando exato; "8,33 sacas" quando há fração (até 2 casas).
 * Singular "1 saca". Arredonda só aqui.
 */
export const formatarSacas = (sacas: number): string => {
  const n = Number.isFinite(sacas) ? sacas : 0;
  const corpo = nf(2).format(n);
  return `${corpo} ${corpo === "1" ? "saca" : "sacas"}`;
};

/** "6.000 kg" (até 2 casas quando fracionado). */
export const formatarKg = (kg: number): string => {
  const n = Number.isFinite(kg) ? kg : 0;
  return `${nf(2).format(n)} kg`;
};

/**
 * "≈ 10 bags de 600 kg" — bag é aproximação logística, sempre com ≈.
 * Sem `pesoPorBagKg` válido (> 0), retorna "—".
 */
export const formatarBags = (kg: number, pesoPorBagKg: number): string => {
  if (!Number.isFinite(kg) || !pesoPorBagKg || pesoPorBagKg <= 0) return "—";
  const qtd = kg / pesoPorBagKg;
  const corpo = nf(1).format(qtd);
  const peso = nf(0).format(pesoPorBagKg);
  return `≈ ${corpo} ${corpo === "1" ? "bag" : "bags"} de ${peso} kg`;
};
