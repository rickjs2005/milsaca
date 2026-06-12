/**
 * Testes do @milsaca/cob — classificação COB (IN 8/2003 MAPA).
 *
 * Os valores esperados derivam da LEITURA DO CÓDIGO em src/index.ts
 * (tabelas EQUIV_INTRINSECA, EQUIV_EXTRINSECA e TABELA_TIPO) e, onde
 * o código implementa a IN, da própria norma:
 *   - 1 preto = 1 defeito; 2 ardidos = 1; 3 conchas = 1;
 *     5 verdes/quebrados/mal granados = 1; brocados 2–5 = 1 (default 3).
 *   - 1 coco = 1; 2 marinheiros = 1; pau/pedra/torrão G/R/P = 5/2/1;
 *     1 casca grande = 1; cascas pequenas a 0,4 (≈2,5 = 1).
 *   - Tipos cheios: 2→4, 3→12, 4→26, 5→46, 6→86, 7→160, 8→360 defeitos.
 *
 * Observação: o pacote NÃO implementa peneiras nem Bica Corrida — só
 * tipo/defeitos e PVA. A regra de prevalência (item 12.6.1) é premissa
 * de entrada (cada grão já chega contado uma única vez).
 */
import { describe, expect, it } from "vitest";

import {
  calcularLaudo,
  calcularPVA,
  SCHEMA_VERSION,
  TABELA_TIPO,
  type DefeitosCrus,
  type DefeitosExtrinsecos,
  type DefeitosIntrinsecos,
  type OpcoesCalculo,
} from "./index";

const ZERO: DefeitosIntrinsecos = {
  pretos: 0,
  ardidos: 0,
  preto_verdes: 0,
  conchas: 0,
  verdes: 0,
  quebrados: 0,
  brocados: 0,
  mal_granados: 0,
};

/** Monta o laudo a partir de overrides parciais (resto zerado). */
function laudo(
  intrinsecos: Partial<DefeitosIntrinsecos> = {},
  extrinsecos?: DefeitosExtrinsecos,
  opts?: OpcoesCalculo,
) {
  const cru: DefeitosCrus = {
    intrinsecos: { ...ZERO, ...intrinsecos },
    ...(extrinsecos ? { extrinsecos } : {}),
  };
  return calcularLaudo(cru, opts);
}

// =================================================================
// (a) Equivalência de defeitos intrínsecos (item 16.1 da IN)
// =================================================================

describe("equivalência intrínseca", () => {
  it("1 grão preto = 1 defeito", () => {
    const r = laudo({ pretos: 10 });
    expect(r.total_defeitos).toBe(10);
    expect(r.breakdown.intrinsecos.pretos).toBe(10);
  });

  it("2 ardidos = 1 defeito (10 ardidos → 5)", () => {
    const r = laudo({ ardidos: 10 });
    expect(r.total_defeitos).toBe(5);
    expect(r.breakdown.intrinsecos.ardidos).toBe(5);
  });

  it("preto-verde equiparado ao ardido (2:1)", () => {
    expect(laudo({ preto_verdes: 4 }).total_defeitos).toBe(2);
  });

  it("3 conchas = 1 defeito (9 conchas → 3)", () => {
    expect(laudo({ conchas: 9 }).total_defeitos).toBe(3);
  });

  it("5 verdes / quebrados / mal granados = 1 defeito", () => {
    expect(laudo({ verdes: 10 }).total_defeitos).toBe(2);
    expect(laudo({ quebrados: 15 }).total_defeitos).toBe(3);
    expect(laudo({ mal_granados: 5 }).total_defeitos).toBe(1);
  });

  it("brocados: default 3 por defeito (SENAR)", () => {
    expect(laudo({ brocados: 10 }).total_defeitos).toBe(3); // floor(10/3)
  });

  it("brocados: opção conservadora (2) e permissiva (5)", () => {
    expect(
      laudo({ brocados: 10 }, undefined, { brocadosPorDefeito: 2 })
        .total_defeitos,
    ).toBe(5);
    expect(
      laudo({ brocados: 10 }, undefined, { brocadosPorDefeito: 5 })
        .total_defeitos,
    ).toBe(2);
  });

  it("esmagados e miolo de concha (5:1) só entram no breakdown quando informados", () => {
    const sem = laudo({});
    expect(sem.breakdown.intrinsecos).not.toHaveProperty("esmagados");
    expect(sem.breakdown.intrinsecos).not.toHaveProperty("miolo_concha");

    const com = laudo({ esmagados: 10, miolo_concha: 7 });
    expect(com.breakdown.intrinsecos.esmagados).toBe(2);
    expect(com.breakdown.intrinsecos.miolo_concha).toBe(1);
    expect(com.total_defeitos).toBe(3);
  });

  it("fração de defeito é truncada POR CATEGORIA (1 ardido + 4 verdes = 0 defeitos)", () => {
    const r = laudo({ ardidos: 1, verdes: 4 });
    expect(r.breakdown.intrinsecos.ardidos).toBe(0);
    expect(r.breakdown.intrinsecos.verdes).toBe(0);
    expect(r.total_defeitos).toBe(0);
    expect(r.tipo).toBe("2");
  });
});

// =================================================================
// (a') Equivalência de defeitos extrínsecos (item 16.2 da IN)
// =================================================================

describe("equivalência extrínseca", () => {
  it("1 coco = 1 defeito; 2 marinheiros = 1 defeito", () => {
    expect(laudo({}, { cocos: 3 }).total_defeitos).toBe(3);
    expect(laudo({}, { marinheiros: 4 }).total_defeitos).toBe(2);
    expect(laudo({}, { marinheiros: 1 }).total_defeitos).toBe(0); // 0,5 trunca
    expect(laudo({}, { marinheiros: 3 }).total_defeitos).toBe(1); // 1,5 trunca
  });

  it("pau/pedra/torrão: grande=5, regular=2, pequeno=1 defeitos por unidade", () => {
    const r = laudo(
      {},
      {
        pau_pedra_torrao_grande: 2,
        pau_pedra_torrao_regular: 3,
        pau_pedra_torrao_pequeno: 4,
      },
    );
    expect(r.breakdown.extrinsecos.pau_pedra_torrao_grande).toBe(10);
    expect(r.breakdown.extrinsecos.pau_pedra_torrao_regular).toBe(6);
    expect(r.breakdown.extrinsecos.pau_pedra_torrao_pequeno).toBe(4);
    expect(r.total_defeitos).toBe(20);
  });

  it("cascas: grande 1:1; pequenas a 0,4 (2 → 0; 5 → 2)", () => {
    expect(laudo({}, { cascas_grandes: 2 }).total_defeitos).toBe(2);
    expect(laudo({}, { cascas_pequenas: 2 }).total_defeitos).toBe(0); // 0,8 trunca
    expect(laudo({}, { cascas_pequenas: 5 }).total_defeitos).toBe(2); // 2,0
  });

  it("extrínsecos zerados não aparecem no breakdown; extrinsecos pode ser omitido", () => {
    const r = laudo({ pretos: 1 }, { cocos: 0, marinheiros: 0 });
    expect(r.breakdown.extrinsecos).toEqual({});

    const semExtrinsecos = laudo({ pretos: 1 });
    expect(semExtrinsecos.total_defeitos).toBe(1);
  });

  it("intrínsecos e extrínsecos somam no mesmo total", () => {
    const r = laudo({ pretos: 5, ardidos: 6 }, { cocos: 2 });
    expect(r.total_defeitos).toBe(5 + 3 + 2);
  });
});

// =================================================================
// (b) Limites de tipo (Tabela 3 da IN — tipos 2 a 8)
// =================================================================

describe("tabela de tipo — limites", () => {
  it("zero defeitos → Tipo 2 (melhor tipo da COB, +100 pontos)", () => {
    const r = laudo({});
    expect(r.total_defeitos).toBe(0);
    expect(r.tipo).toBe("2");
    expect(r.pontuacao).toBe(100);
    expect(r.fora_de_tipo).toBe(false);
  });

  it("4 defeitos = Tipo 2; 5 defeitos = Tipo 2-5", () => {
    expect(laudo({ pretos: 4 }).tipo).toBe("2");
    const r = laudo({ pretos: 5 });
    expect(r.tipo).toBe("2-5");
    expect(r.pontuacao).toBe(90);
  });

  it("12 defeitos = Tipo 3 (+40); 13 = Tipo 3-5", () => {
    const r = laudo({ pretos: 12 });
    expect(r.tipo).toBe("3");
    expect(r.pontuacao).toBe(40);
    expect(laudo({ pretos: 13 }).tipo).toBe("3-5");
  });

  it("26 defeitos = Tipo 4 (base zero); 27 = Tipo 4-5", () => {
    const r = laudo({ pretos: 26 });
    expect(r.tipo).toBe("4");
    expect(r.pontuacao).toBe(0);
    const r2 = laudo({ pretos: 27 });
    expect(r2.tipo).toBe("4-5");
    expect(r2.pontuacao).toBe(-5);
  });

  it("45 defeitos = Tipo 4-25; 46 = Tipo 5 (-30)", () => {
    expect(laudo({ pretos: 45 }).tipo).toBe("4-25");
    const r = laudo({ pretos: 46 });
    expect(r.tipo).toBe("5");
    expect(r.pontuacao).toBe(-30);
  });

  it("86 defeitos = Tipo 6 (-60)", () => {
    // pretos no teto (50) + 72 ardidos (36) = 86, sem disparar Fora de Tipo
    const r = laudo({ pretos: 50, ardidos: 72 });
    expect(r.total_defeitos).toBe(86);
    expect(r.tipo).toBe("6");
    expect(r.pontuacao).toBe(-60);
    expect(r.fora_de_tipo).toBe(false);
  });

  it("160 defeitos = Tipo 7 (-110)", () => {
    const r = laudo({ pretos: 50, ardidos: 100, verdes: 300 });
    expect(r.total_defeitos).toBe(160);
    expect(r.tipo).toBe("7");
    expect(r.pontuacao).toBe(-110);
  });

  it("360 defeitos = Tipo 8 (-200), pior tipo comercializável", () => {
    // 50 + 50 + 50 + 105 + 105 = 360; excluindo leves = 255 (≤ 300)
    const r = laudo({
      pretos: 50,
      ardidos: 100,
      preto_verdes: 100,
      verdes: 525,
      quebrados: 525,
    });
    expect(r.total_defeitos).toBe(360);
    expect(r.tipo).toBe("8");
    expect(r.pontuacao).toBe(-200);
    expect(r.fora_de_tipo).toBe(false);
  });

  it("TABELA_TIPO é crescente e cobre de Tipo 2 (4) a Tipo 8 (360)", () => {
    expect(TABELA_TIPO[0]).toMatchObject({ tipo: "2", limite: 4, pontuacao: 100 });
    expect(TABELA_TIPO[TABELA_TIPO.length - 1]).toMatchObject({
      tipo: "8",
      limite: 360,
      pontuacao: -200,
    });
    for (let i = 1; i < TABELA_TIPO.length; i++) {
      const anterior = TABELA_TIPO[i - 1]!;
      const atual = TABELA_TIPO[i]!;
      expect(atual.limite).toBeGreaterThan(anterior.limite);
      expect(atual.pontuacao).toBeLessThan(anterior.pontuacao);
    }
  });
});

// =================================================================
// (c) Regra de prevalência (item 12.6.1) — premissa de entrada
// =================================================================

describe("regra de prevalência", () => {
  it("categorias são exclusivas e somadas de forma independente (prevalência já aplicada na catação)", () => {
    // O mesmo grão NUNCA chega em duas categorias: o chamador conta
    // cada grão uma vez pelo defeito mais grave. A função apenas soma.
    const r = laudo({ pretos: 2, ardidos: 2 });
    expect(r.total_defeitos).toBe(2 + 1);
    expect(r.breakdown.intrinsecos.pretos).toBe(2);
    expect(r.breakdown.intrinsecos.ardidos).toBe(1);
  });

  it("não há deduplicação interna: somar o mesmo grão duas vezes infla o total (responsabilidade do chamador)", () => {
    const contadoUmaVez = laudo({ pretos: 10 });
    const contadoDuasVezes = laudo({ pretos: 10, ardidos: 10 });
    expect(contadoDuasVezes.total_defeitos).toBeGreaterThan(
      contadoUmaVez.total_defeitos,
    );
  });
});

// =================================================================
// (d) Fora de Tipo
// =================================================================

describe("fora de tipo", () => {
  it("mais de 50 grãos pretos → Fora de Tipo, mesmo com total baixo", () => {
    const r = laudo({ pretos: 51 });
    expect(r.fora_de_tipo).toBe(true);
    expect(r.tipo).toBeNull();
    expect(r.pontuacao).toBeNull();
    expect(r.fora_de_tipo_motivos).toEqual(["> 50 grãos pretos (51)"]);
  });

  it("exatamente 50 pretos NÃO é Fora de Tipo (limite inclusivo)", () => {
    const r = laudo({ pretos: 50 });
    expect(r.fora_de_tipo).toBe(false);
    expect(r.tipo).toBe("5-5"); // 50 defeitos
  });

  it("mais de 100 ardidos → Fora de Tipo; 100 ainda classifica", () => {
    expect(laudo({ ardidos: 101 }).fora_de_tipo).toBe(true);
    const ok = laudo({ ardidos: 100 });
    expect(ok.fora_de_tipo).toBe(false);
    expect(ok.tipo).toBe("5-5"); // 50 defeitos
  });

  it("mais de 100 preto-verdes → Fora de Tipo", () => {
    const r = laudo({ preto_verdes: 101 });
    expect(r.fora_de_tipo).toBe(true);
    expect(r.fora_de_tipo_motivos[0]).toContain("preto-verdes");
  });

  it("mais de 300 defeitos excluindo leves → Fora de Tipo (extrínsecos contam)", () => {
    const r = laudo({}, { cocos: 301 });
    expect(r.breakdown.total_excluindo_leves).toBe(301);
    expect(r.fora_de_tipo).toBe(true);
    expect(r.tipo).toBeNull();
    expect(r.fora_de_tipo_motivos[0]).toContain("300 defeitos");
  });

  it("defeitos leves (quebrados etc.) NÃO contam pro limite de 300", () => {
    // 1505 quebrados = 301 defeitos, todos leves → continua classificável
    const r = laudo({ quebrados: 1505 });
    expect(r.total_defeitos).toBe(301);
    expect(r.breakdown.total_excluindo_leves).toBe(0);
    expect(r.fora_de_tipo).toBe(false);
    expect(r.tipo).toBe("7-20"); // 280 < 301 ≤ 320
  });

  it("total acima de 360 sem bater condição específica → Fora de Tipo extra-tabela", () => {
    // 1805 quebrados = 361 defeitos, todos leves (excluindo leves = 0)
    const r = laudo({ quebrados: 1805 });
    expect(r.total_defeitos).toBe(361);
    expect(r.fora_de_tipo).toBe(true);
    expect(r.tipo).toBeNull();
    expect(r.pontuacao).toBeNull();
    expect(r.fora_de_tipo_motivos[0]).toContain("excede o máximo da tabela");
  });

  it("condições são OR lógico: múltiplos motivos acumulam", () => {
    const r = laudo({ pretos: 51, ardidos: 101 });
    expect(r.fora_de_tipo).toBe(true);
    expect(r.fora_de_tipo_motivos).toHaveLength(2);
  });
});

// =================================================================
// (f) PVA — Preto, Verde, Ardido (% sobre amostra de 100 g)
// =================================================================

describe("calcularPVA", () => {
  it("zero grãos defeituosos → PVA 0% (padrão Gourmet)", () => {
    expect(calcularPVA({ pretos: 0, verdes: 0, ardidos: 0 })).toBe(0);
  });

  it("usa 600 grãos como padrão de 100 g (6 grãos → 1%)", () => {
    expect(calcularPVA({ pretos: 3, verdes: 2, ardidos: 1 })).toBe(1);
  });

  it("aceita total_graos customizado (25 em 500 → 5%)", () => {
    expect(
      calcularPVA({ pretos: 10, verdes: 10, ardidos: 5, total_graos: 500 }),
    ).toBe(5);
  });

  it("arredonda para 2 casas decimais (1/600 → 0.17)", () => {
    expect(calcularPVA({ pretos: 1, verdes: 0, ardidos: 0 })).toBe(0.17);
  });

  it("total_graos zero ou negativo → 0 (sem divisão por zero)", () => {
    expect(
      calcularPVA({ pretos: 5, verdes: 5, ardidos: 5, total_graos: 0 }),
    ).toBe(0);
    expect(
      calcularPVA({ pretos: 5, verdes: 5, ardidos: 5, total_graos: -10 }),
    ).toBe(0);
  });

  it("limite Superior: até 10% (60 grãos em 600)", () => {
    expect(calcularPVA({ pretos: 30, verdes: 20, ardidos: 10 })).toBe(10);
  });
});

// =================================================================
// (h) Casos de borda e contrato do resultado
// =================================================================

describe("bordas e contrato", () => {
  it("resultado carrega o SCHEMA_VERSION vigente (=1)", () => {
    expect(SCHEMA_VERSION).toBe(1);
    expect(laudo({}).schema_version).toBe(1);
  });

  it("breakdown.total_excluindo_leves reflete só os defeitos graves", () => {
    const r = laudo({ pretos: 10, quebrados: 25, conchas: 6, brocados: 9 });
    // pretos 10 + quebrados 5 + conchas 2 + brocados 3 = 20
    expect(r.total_defeitos).toBe(20);
    expect(r.breakdown.total_excluindo_leves).toBe(10);
  });

  it("COMPORTAMENTO ATUAL: valores negativos não são rejeitados (sem validação de input)", () => {
    // A API aceita contagem negativa e classifica como Tipo 2.
    // Validação fica a cargo do chamador (form/schema na borda).
    const r = laudo({ pretos: -5 });
    expect(r.total_defeitos).toBe(-5);
    expect(r.tipo).toBe("2");
    expect(r.fora_de_tipo).toBe(false);
  });

  it("COMPORTAMENTO ATUAL: contagens fracionárias de grãos são aceitas e truncadas por categoria", () => {
    const r = laudo({ pretos: 2.7 });
    expect(r.breakdown.intrinsecos.pretos).toBe(2); // floor(2.7/1)
    expect(r.total_defeitos).toBe(2);
  });

  it("Tipo 5-5 cobre o intervalo 47–53", () => {
    expect(laudo({ pretos: 47 }).tipo).toBe("5-5");
    const r = laudo({ pretos: 50, verdes: 15 }); // 53
    expect(r.total_defeitos).toBe(53);
    expect(r.tipo).toBe("5-5");
    expect(laudo({ pretos: 50, verdes: 20 }).tipo).toBe("5-10"); // 54
  });
});
