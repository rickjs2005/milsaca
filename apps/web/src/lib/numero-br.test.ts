import { describe, expect, it } from "vitest";
import { limparNumeroBR, parseInteiroBR, parseNumeroBR } from "./numero-br";

describe("parseNumeroBR (default: n >= 0)", () => {
  it("parseia decimal pt-BR com milhar e vírgula", () => {
    expect(parseNumeroBR("1.450,00")).toBe(1450);
    expect(parseNumeroBR("1.234,56")).toBe(1234.56);
    expect(parseNumeroBR("1.234.567,89")).toBe(1234567.89);
  });

  it("parseia inteiro simples e decimal só com vírgula", () => {
    expect(parseNumeroBR("1450")).toBe(1450);
    expect(parseNumeroBR("8,33")).toBe(8.33);
    expect(parseNumeroBR("0,5")).toBe(0.5);
  });

  it("PEGADINHA: ponto é SEMPRE milhar, mesmo sem vírgula", () => {
    // Comportamento histórico das cópias — remove todos os pontos.
    expect(parseNumeroBR("12.5")).toBe(125);
    expect(parseNumeroBR("1234.56")).toBe(123456);
    expect(parseNumeroBR(12.5)).toBe(125); // number vira String("12.5") e cai na mesma regra
  });

  it("vírgula sem parte inteira funciona", () => {
    expect(parseNumeroBR(",5")).toBe(0.5);
  });

  it("remove espaços inclusive internos", () => {
    expect(parseNumeroBR("  1.450,00  ")).toBe(1450);
    expect(parseNumeroBR("1 000,5")).toBe(1000.5);
  });

  it("aceita zero por padrão (n >= 0)", () => {
    expect(parseNumeroBR("0")).toBe(0);
    expect(parseNumeroBR("0,00")).toBe(0);
  });

  it("null/undefined/vazio/whitespace viram null", () => {
    expect(parseNumeroBR(null)).toBeNull();
    expect(parseNumeroBR(undefined)).toBeNull();
    expect(parseNumeroBR("")).toBeNull();
    expect(parseNumeroBR("   ")).toBeNull();
  });

  it("lixo vira null", () => {
    expect(parseNumeroBR("abc")).toBeNull();
    expect(parseNumeroBR("12a")).toBeNull();
  });

  it("NÃO limpa R$ (preservado: quem limpa moeda é o call-site)", () => {
    expect(parseNumeroBR("R$ 1.000,00")).toBeNull();
    expect(parseNumeroBR("R$10")).toBeNull();
  });

  it("só a primeira vírgula é trocada — duas vírgulas viram null", () => {
    expect(parseNumeroBR("1,2,3")).toBeNull();
  });

  it("negativo vira null por padrão", () => {
    expect(parseNumeroBR("-10")).toBeNull();
    expect(parseNumeroBR("-0,5")).toBeNull();
  });
});

describe("parseNumeroBR({ exigirPositivo: true })", () => {
  it("aceita positivos", () => {
    expect(parseNumeroBR("1.234,56", { exigirPositivo: true })).toBe(1234.56);
    expect(parseNumeroBR("0,01", { exigirPositivo: true })).toBe(0.01);
  });

  it("zero e negativos viram null", () => {
    expect(parseNumeroBR("0", { exigirPositivo: true })).toBeNull();
    expect(parseNumeroBR("0,00", { exigirPositivo: true })).toBeNull();
    expect(parseNumeroBR("-5", { exigirPositivo: true })).toBeNull();
  });

  it("vazio/inválido viram null", () => {
    expect(parseNumeroBR("", { exigirPositivo: true })).toBeNull();
    expect(parseNumeroBR("abc", { exigirPositivo: true })).toBeNull();
  });
});

describe("parseNumeroBR({ permitirNegativo: true })", () => {
  it("aceita negativos e zero (só exige finito)", () => {
    expect(parseNumeroBR("-10", { permitirNegativo: true })).toBe(-10);
    expect(parseNumeroBR("-1.234,56", { permitirNegativo: true })).toBe(-1234.56);
    expect(parseNumeroBR("0", { permitirNegativo: true })).toBe(0);
  });

  it("inválido segue null", () => {
    expect(parseNumeroBR("abc", { permitirNegativo: true })).toBeNull();
    expect(parseNumeroBR("", { permitirNegativo: true })).toBeNull();
  });
});

describe("limparNumeroBR (normalização crua, sem validação)", () => {
  it("normaliza mas não valida", () => {
    expect(limparNumeroBR("1.234,56")).toBe("1234.56");
    expect(limparNumeroBR(" 1 000,5 ")).toBe("1000.5");
    expect(limparNumeroBR("12.5")).toBe("125"); // pegadinha do milhar
    expect(limparNumeroBR("")).toBe("");
    expect(limparNumeroBR("abc")).toBe("abc"); // Number() disso é NaN — call-site decide
  });

  it("whitespace-only vira string vazia (Number('') === 0 nos zod transforms)", () => {
    // Quirk preservado dos schemas: "   " → "" → Number("") === 0.
    expect(limparNumeroBR("   ")).toBe("");
    expect(Number(limparNumeroBR("   "))).toBe(0);
  });
});

describe("parseInteiroBR", () => {
  it("parseia inteiro >= 0", () => {
    expect(parseInteiroBR("10")).toBe(10);
    expect(parseInteiroBR(" 7 ")).toBe(7);
    expect(parseInteiroBR("0")).toBe(0);
  });

  it("parseInt para no primeiro não-dígito (comportamento histórico)", () => {
    expect(parseInteiroBR("1.234")).toBe(1); // NÃO é 1234!
    expect(parseInteiroBR("12,9")).toBe(12);
    expect(parseInteiroBR("10.9")).toBe(10);
  });

  it("vazio/null/lixo/negativo viram null", () => {
    expect(parseInteiroBR(null)).toBeNull();
    expect(parseInteiroBR(undefined)).toBeNull();
    expect(parseInteiroBR("")).toBeNull();
    expect(parseInteiroBR("   ")).toBeNull();
    expect(parseInteiroBR("abc")).toBeNull();
    expect(parseInteiroBR("-3")).toBeNull();
  });
});
