import { describe, it, expect } from "vitest";
import {
  aprovarCorretoraSchema,
  corretoraSchema,
  flattenZodErrors,
  formDataToObject,
  planSchema,
  rejeitarCorretoraSchema,
  ufSchema,
  uuidSchema,
} from "./schemas";

describe("uuidSchema", () => {
  it("aceita UUID v4 válido", () => {
    const r = uuidSchema.safeParse("550e8400-e29b-41d4-a716-446655440000");
    expect(r.success).toBe(true);
  });

  it("rejeita string vazia ou inválida", () => {
    expect(uuidSchema.safeParse("").success).toBe(false);
    expect(uuidSchema.safeParse("not-a-uuid").success).toBe(false);
    expect(uuidSchema.safeParse("123").success).toBe(false);
  });
});

describe("ufSchema", () => {
  it("aceita UF válida e normaliza pra uppercase", () => {
    const r = ufSchema.safeParse("mg");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("MG");
  });

  it("rejeita UF com mais de 2 letras", () => {
    expect(ufSchema.safeParse("MGS").success).toBe(false);
  });

  it("rejeita UF com números", () => {
    expect(ufSchema.safeParse("M1").success).toBe(false);
  });
});

describe("corretoraSchema", () => {
  it("aceita payload mínimo (só nome)", () => {
    const r = corretoraSchema.safeParse({ name: "Café X" });
    expect(r.success).toBe(true);
  });

  it("rejeita sem nome", () => {
    const r = corretoraSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("normaliza CNPJ válido pra digits-only", () => {
    // 11.222.333/0001-81 é CNPJ com DV correto
    const r = corretoraSchema.safeParse({
      name: "X",
      cnpj: "11.222.333/0001-81",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.cnpj).toBe("11222333000181");
  });

  it("rejeita CNPJ com tamanho errado", () => {
    const r = corretoraSchema.safeParse({ name: "X", cnpj: "12345" });
    expect(r.success).toBe(false);
  });

  it("rejeita CNPJ com DV inválido (todos iguais)", () => {
    const r = corretoraSchema.safeParse({
      name: "X",
      cnpj: "11111111111111",
    });
    expect(r.success).toBe(false);
  });

  it("aceita CNPJ vazio (null)", () => {
    const r = corretoraSchema.safeParse({ name: "X", cnpj: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.cnpj).toBeNull();
  });

  it("rejeita email malformado", () => {
    const r = corretoraSchema.safeParse({ name: "X", email: "abc" });
    expect(r.success).toBe(false);
  });

  it("aceita lat/lng dentro do range", () => {
    const r = corretoraSchema.safeParse({
      name: "X",
      lat: "-20.2587",
      lng: "-42.0289",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.lat).toBe(-20.2587);
      expect(r.data.lng).toBe(-42.0289);
    }
  });

  it("aceita lat/lng com vírgula", () => {
    const r = corretoraSchema.safeParse({ name: "X", lat: "-20,2587" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.lat).toBe(-20.2587);
  });

  it("rejeita lat fora do range -90..90", () => {
    const r = corretoraSchema.safeParse({ name: "X", lat: "95" });
    expect(r.success).toBe(false);
  });

  it("rejeita região inválida", () => {
    const r = corretoraSchema.safeParse({
      name: "X",
      regioes_atendimento: ["regiao_inexistente"],
    });
    expect(r.success).toBe(false);
  });
});

describe("aprovarCorretoraSchema", () => {
  it("aceita payload válido com CNPJ real (DV correto)", () => {
    const r = aprovarCorretoraSchema.safeParse({
      profile_id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Café X",
      cnpj: "11222333000181",
      city: "Manhuaçu",
      state: "MG",
    });
    expect(r.success).toBe(true);
  });

  it("rejeita CNPJ com DV inválido", () => {
    const r = aprovarCorretoraSchema.safeParse({
      profile_id: "550e8400-e29b-41d4-a716-446655440000",
      name: "X",
      cnpj: "12345678000190",
      city: "Y",
    });
    expect(r.success).toBe(false);
  });

  it("rejeita sem CNPJ", () => {
    const r = aprovarCorretoraSchema.safeParse({
      profile_id: "550e8400-e29b-41d4-a716-446655440000",
      name: "X",
      city: "Y",
    });
    expect(r.success).toBe(false);
  });
});

describe("planSchema", () => {
  it("aceita plano mensal", () => {
    const r = planSchema.safeParse({
      name: "Mensal",
      price_cents: 19900,
      billing_period: "monthly",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.features).toEqual([]);
  });

  it("rejeita price negativo", () => {
    const r = planSchema.safeParse({
      name: "X",
      price_cents: -100,
      billing_period: "monthly",
    });
    expect(r.success).toBe(false);
  });

  it("rejeita billing_period inválido", () => {
    const r = planSchema.safeParse({
      name: "X",
      price_cents: 100,
      billing_period: "weekly",
    });
    expect(r.success).toBe(false);
  });

  it("active default true", () => {
    const r = planSchema.safeParse({
      name: "X",
      price_cents: 0,
      billing_period: "monthly",
    });
    if (r.success) expect(r.data.active).toBe(true);
  });
});

describe("formDataToObject", () => {
  it("converte FormData simples", () => {
    const fd = new FormData();
    fd.set("name", "X");
    fd.set("email", "a@b.c");
    const o = formDataToObject(fd);
    expect(o).toEqual({ name: "X", email: "a@b.c" });
  });

  it("agrupa array keys", () => {
    const fd = new FormData();
    fd.append("regioes_atendimento", "zona_da_mata");
    fd.append("regioes_atendimento", "caparao");
    fd.set("name", "X");
    const o = formDataToObject(fd, ["regioes_atendimento"]);
    expect(o.regioes_atendimento).toEqual(["zona_da_mata", "caparao"]);
    expect(o.name).toBe("X");
  });
});

describe("flattenZodErrors", () => {
  it("concatena issues com '; '", () => {
    const r = corretoraSchema.safeParse({});
    if (!r.success) {
      const flat = flattenZodErrors(r.error);
      expect(flat).toMatch(/obrigatório/i);
      expect(flat).not.toContain("undefined");
    }
  });
});

describe("rejeitarCorretoraSchema", () => {
  it("só precisa de profile_id válido", () => {
    const r = rejeitarCorretoraSchema.safeParse({
      profile_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(r.success).toBe(true);
  });

  it("rejeita profile_id inválido", () => {
    expect(
      rejeitarCorretoraSchema.safeParse({ profile_id: "abc" }).success,
    ).toBe(false);
  });
});
