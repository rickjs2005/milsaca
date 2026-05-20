import { describe, expect, it } from "vitest";
import {
  cepOptionalSchema,
  citySchema,
  cityOptionalSchema,
  cnpjOptionalSchema,
  cnpjSchema,
  cpfOptionalSchema,
  cpfOrCnpjOptionalSchema,
  cpfOrCnpjSchema,
  cpfSchema,
  phoneBROptionalSchema,
  phoneBRSchema,
  ufOptionalSchema,
  ufSchema,
  whatsappOptionalSchema,
  whatsappSchema,
} from "./brasil-schemas";

const CPF_VALIDO_MASCARADO = "529.982.247-25";
const CNPJ_VALIDO_MASCARADO = "11.222.333/0001-81";

describe("cpfSchema", () => {
  it("aceita mascarado e devolve dígitos", () => {
    const r = cpfSchema.safeParse(CPF_VALIDO_MASCARADO);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("52998224725");
  });

  it("rejeita DV inválido", () => {
    expect(cpfSchema.safeParse("11111111111").success).toBe(false);
    expect(cpfSchema.safeParse("52998224726").success).toBe(false);
  });

  it("rejeita vazio", () => {
    expect(cpfSchema.safeParse("").success).toBe(false);
  });
});

describe("cpfOptionalSchema", () => {
  it("aceita vazio como null", () => {
    const r = cpfOptionalSchema.safeParse("");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBeNull();
  });

  it("rejeita preenchido inválido", () => {
    expect(cpfOptionalSchema.safeParse("11111111111").success).toBe(false);
  });

  it("aceita preenchido válido e normaliza", () => {
    const r = cpfOptionalSchema.safeParse(CPF_VALIDO_MASCARADO);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("52998224725");
  });
});

describe("cnpjSchema", () => {
  it("aceita mascarado e devolve dígitos", () => {
    const r = cnpjSchema.safeParse(CNPJ_VALIDO_MASCARADO);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("11222333000181");
  });

  it("rejeita DV inválido", () => {
    expect(cnpjSchema.safeParse("12345678000190").success).toBe(false);
    expect(cnpjSchema.safeParse("11111111111111").success).toBe(false);
  });

  it("rejeita vazio", () => {
    expect(cnpjSchema.safeParse("").success).toBe(false);
  });
});

describe("cnpjOptionalSchema", () => {
  it("aceita vazio como null", () => {
    const r = cnpjOptionalSchema.safeParse("");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBeNull();
  });

  it("rejeita preenchido inválido", () => {
    expect(cnpjOptionalSchema.safeParse("11111111111111").success).toBe(
      false,
    );
  });
});

describe("cpfOrCnpjSchema", () => {
  it("aceita CPF válido", () => {
    const r = cpfOrCnpjSchema.safeParse(CPF_VALIDO_MASCARADO);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("52998224725");
  });

  it("aceita CNPJ válido", () => {
    const r = cpfOrCnpjSchema.safeParse(CNPJ_VALIDO_MASCARADO);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("11222333000181");
  });

  it("rejeita tamanho intermediário", () => {
    expect(cpfOrCnpjSchema.safeParse("123456789012").success).toBe(false);
  });
});

describe("cpfOrCnpjOptionalSchema", () => {
  it("aceita vazio como null", () => {
    const r = cpfOrCnpjOptionalSchema.safeParse("");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBeNull();
  });
});

describe("phoneBRSchema", () => {
  it("aceita celular mascarado e devolve 55DDD9XXXXXXXX", () => {
    const r = phoneBRSchema.safeParse("(33) 99999-1234");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("5533999991234");
  });

  it("aceita fixo válido", () => {
    const r = phoneBRSchema.safeParse("(33) 3333-4444");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("553333334444");
  });

  it("rejeita vazio", () => {
    expect(phoneBRSchema.safeParse("").success).toBe(false);
  });

  it("rejeita celular sem 9", () => {
    expect(phoneBRSchema.safeParse("(33) 8999-1234").success).toBe(false);
  });
});

describe("phoneBROptionalSchema", () => {
  it("vazio vira null", () => {
    const r = phoneBROptionalSchema.safeParse("");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBeNull();
  });

  it("preenchido inválido falha", () => {
    expect(phoneBROptionalSchema.safeParse("123").success).toBe(false);
  });

  it("preenchido válido normaliza", () => {
    const r = phoneBROptionalSchema.safeParse("(33) 99999-1234");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("5533999991234");
  });
});

describe("whatsappSchema / whatsappOptionalSchema", () => {
  it("whatsappSchema = phoneBRSchema com mensagem própria", () => {
    const r = whatsappSchema.safeParse("(33) 99999-1234");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("5533999991234");
  });

  it("whatsappOptionalSchema aceita vazio", () => {
    const r = whatsappOptionalSchema.safeParse("");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBeNull();
  });
});

describe("ufSchema", () => {
  it("aceita UF válida (case-insensitive)", () => {
    const r = ufSchema.safeParse("mg");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("MG");
  });

  it("rejeita inválida", () => {
    expect(ufSchema.safeParse("xx").success).toBe(false);
    expect(ufSchema.safeParse("").success).toBe(false);
  });
});

describe("ufOptionalSchema", () => {
  it("vazio vira null", () => {
    const r = ufOptionalSchema.safeParse("");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBeNull();
  });

  it("normaliza pra uppercase", () => {
    const r = ufOptionalSchema.safeParse("sp");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("SP");
  });
});

describe("citySchema", () => {
  it("normaliza espaços e aceita acentos", () => {
    const r = citySchema.safeParse("  São João del-Rei  ");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("São João del-Rei");
  });

  it("rejeita vazio", () => {
    expect(citySchema.safeParse("").success).toBe(false);
  });

  it("rejeita caracteres inválidos", () => {
    expect(citySchema.safeParse("Cidade 123").success).toBe(false);
    expect(citySchema.safeParse("<script>").success).toBe(false);
  });
});

describe("cityOptionalSchema", () => {
  it("vazio vira null", () => {
    const r = cityOptionalSchema.safeParse("");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBeNull();
  });

  it("preenchido inválido falha", () => {
    expect(cityOptionalSchema.safeParse("Cidade [SP]").success).toBe(false);
  });
});

describe("cepOptionalSchema", () => {
  it("vazio vira null", () => {
    const r = cepOptionalSchema.safeParse("");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBeNull();
  });

  it("aceita mascarado e devolve dígitos", () => {
    const r = cepOptionalSchema.safeParse("36900-000");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("36900000");
  });

  it("rejeita CEP incompleto", () => {
    expect(cepOptionalSchema.safeParse("3690000").success).toBe(false);
  });

  it("rejeita CEP todo zero", () => {
    expect(cepOptionalSchema.safeParse("00000000").success).toBe(false);
  });
});
