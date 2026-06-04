import { describe, it, expect } from "vitest";
import {
  KG_POR_SACA,
  kgParaSacas,
  sacasParaKg,
  bagsParaKg,
  kgParaUnidade,
  formatarSacas,
  formatarKg,
  formatarBags,
} from "./unidades";

describe("conversões puras (sem perda de precisão)", () => {
  it("1 saca = 60 kg", () => {
    expect(KG_POR_SACA).toBe(60);
    expect(sacasParaKg(1)).toBe(60);
    expect(kgParaSacas(60)).toBe(1);
  });

  it("6.000 kg = 100 sacas (exato)", () => {
    expect(kgParaSacas(6000)).toBe(100);
  });

  it("500 kg = 8,333… sacas — NÃO arredonda no cálculo", () => {
    expect(kgParaSacas(500)).toBeCloseTo(8.3333333, 6);
    // o 0,333 não some: 8 nem 9
    expect(kgParaSacas(500)).not.toBe(8);
    expect(kgParaSacas(500)).not.toBe(9);
  });

  it("10 bags × 600 kg = 6.000 kg = 100 sacas", () => {
    const kg = bagsParaKg(10, 600);
    expect(kg).toBe(6000);
    expect(kgParaSacas(kg)).toBe(100);
  });

  it("ida-e-volta saca↔kg sem perda", () => {
    for (const sacas of [1, 8.3333333, 100, 0.5, 123.456]) {
      expect(kgParaSacas(sacasParaKg(sacas))).toBeCloseTo(sacas, 9);
    }
  });

  it("kgParaUnidade cobre as três unidades", () => {
    expect(kgParaUnidade(6000, "kg")).toBe(6000);
    expect(kgParaUnidade(6000, "saca")).toBe(100);
    expect(kgParaUnidade(6000, "bag", 600)).toBe(10);
  });

  it("kgParaUnidade('bag') sem peso válido → NaN", () => {
    expect(Number.isNaN(kgParaUnidade(6000, "bag"))).toBe(true);
    expect(Number.isNaN(kgParaUnidade(6000, "bag", 0))).toBe(true);
  });
});

describe("formatação pt-BR (arredonda só aqui)", () => {
  it("formatarSacas: inteiro exato e fração", () => {
    expect(formatarSacas(100)).toBe("100 sacas");
    expect(formatarSacas(8.3333333)).toBe("8,33 sacas");
    expect(formatarSacas(1)).toBe("1 saca");
  });

  it("formatarKg: milhar pt-BR", () => {
    expect(formatarKg(6000)).toBe("6.000 kg");
    expect(formatarKg(500)).toBe("500 kg");
  });

  it("formatarBags: aproximação com ≈ e plural", () => {
    expect(formatarBags(6000, 600)).toBe("≈ 10 bags de 600 kg");
    expect(formatarBags(600, 600)).toBe("≈ 1 bag de 600 kg");
    expect(formatarBags(6000, 0)).toBe("—");
  });
});
