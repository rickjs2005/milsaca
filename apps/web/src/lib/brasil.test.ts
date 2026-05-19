import { describe, expect, it } from "vitest";
import {
  buildWhatsAppLink,
  formatCNPJ,
  formatCPF,
  formatCityName,
  formatCpfOrCnpj,
  formatPhoneBR,
  isValidCNPJ,
  isValidCPF,
  isValidCityName,
  isValidCpfOrCnpj,
  isValidPhoneBR,
  isValidUF,
  normalizeCNPJ,
  normalizeCPF,
  normalizeCpfOrCnpj,
  normalizePhoneBR,
  normalizeUF,
  onlyDigits,
  toWhatsAppE164,
  UFS,
} from "./brasil";

// CPF/CNPJ com DV correto pra reuso.
const CPF_VALIDO = "52998224725";
const CPF_VALIDO_MASCARADO = "529.982.247-25";
const CNPJ_VALIDO = "11222333000181";
const CNPJ_VALIDO_MASCARADO = "11.222.333/0001-81";

describe("onlyDigits", () => {
  it("remove tudo que não é dígito", () => {
    expect(onlyDigits("(33) 99999-1234")).toBe("33999991234");
    expect(onlyDigits("abc 123 def 456")).toBe("123456");
    expect(onlyDigits("")).toBe("");
    expect(onlyDigits(null)).toBe("");
    expect(onlyDigits(undefined)).toBe("");
  });
});

describe("isValidCPF", () => {
  it("aceita CPF válido cru ou mascarado", () => {
    expect(isValidCPF(CPF_VALIDO)).toBe(true);
    expect(isValidCPF(CPF_VALIDO_MASCARADO)).toBe(true);
  });

  it("rejeita CPF de tamanho errado", () => {
    expect(isValidCPF("123")).toBe(false);
    expect(isValidCPF("123456789012")).toBe(false);
  });

  it("rejeita CPF com todos os dígitos iguais", () => {
    expect(isValidCPF("00000000000")).toBe(false);
    expect(isValidCPF("11111111111")).toBe(false);
    expect(isValidCPF("99999999999")).toBe(false);
  });

  it("rejeita CPF com DV errado", () => {
    // troca último dígito do válido
    expect(isValidCPF("52998224726")).toBe(false);
  });

  it("rejeita null/undefined/vazio", () => {
    expect(isValidCPF(null)).toBe(false);
    expect(isValidCPF(undefined)).toBe(false);
    expect(isValidCPF("")).toBe(false);
  });
});

describe("formatCPF / normalizeCPF", () => {
  it("aplica máscara progressivamente", () => {
    expect(formatCPF("5")).toBe("5");
    expect(formatCPF("529")).toBe("529");
    expect(formatCPF("5299")).toBe("529.9");
    expect(formatCPF("529982")).toBe("529.982");
    expect(formatCPF("5299822")).toBe("529.982.2");
    expect(formatCPF("52998224725")).toBe("529.982.247-25");
  });

  it("normaliza qualquer input pra só dígitos com máx 11", () => {
    expect(normalizeCPF("529.982.247-25")).toBe("52998224725");
    expect(normalizeCPF("529982247259999")).toBe("52998224725");
    expect(normalizeCPF("")).toBe("");
    expect(normalizeCPF(null)).toBe("");
  });
});

describe("isValidCNPJ", () => {
  it("aceita CNPJ válido cru ou mascarado", () => {
    expect(isValidCNPJ(CNPJ_VALIDO)).toBe(true);
    expect(isValidCNPJ(CNPJ_VALIDO_MASCARADO)).toBe(true);
  });

  it("rejeita CNPJ de tamanho errado", () => {
    expect(isValidCNPJ("11222333")).toBe(false);
    expect(isValidCNPJ("112223330001811")).toBe(false);
  });

  it("rejeita CNPJ com todos iguais", () => {
    expect(isValidCNPJ("00000000000000")).toBe(false);
    expect(isValidCNPJ("11111111111111")).toBe(false);
  });

  it("rejeita CNPJ com DV errado", () => {
    expect(isValidCNPJ("11222333000180")).toBe(false);
    // 12345678000190 é o CNPJ "famoso" de exemplo, mas tem DV inválido
    expect(isValidCNPJ("12345678000190")).toBe(false);
  });

  it("rejeita null/undefined/vazio", () => {
    expect(isValidCNPJ(null)).toBe(false);
    expect(isValidCNPJ("")).toBe(false);
  });
});

describe("formatCNPJ / normalizeCNPJ", () => {
  it("aplica máscara progressivamente", () => {
    expect(formatCNPJ("1")).toBe("1");
    expect(formatCNPJ("11")).toBe("11");
    expect(formatCNPJ("112")).toBe("11.2");
    expect(formatCNPJ("11222")).toBe("11.222");
    expect(formatCNPJ("112223")).toBe("11.222.3");
    expect(formatCNPJ("11222333")).toBe("11.222.333");
    expect(formatCNPJ("112223330001")).toBe("11.222.333/0001");
    expect(formatCNPJ("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("normaliza pra dígitos com máx 14", () => {
    expect(normalizeCNPJ("11.222.333/0001-81")).toBe("11222333000181");
    expect(normalizeCNPJ("11222333000181999")).toBe("11222333000181");
  });
});

describe("isValidCpfOrCnpj", () => {
  it("aceita CPF ou CNPJ válido", () => {
    expect(isValidCpfOrCnpj(CPF_VALIDO)).toBe(true);
    expect(isValidCpfOrCnpj(CNPJ_VALIDO)).toBe(true);
  });

  it("rejeita tamanhos intermediários (12, 13 dígitos)", () => {
    expect(isValidCpfOrCnpj("123456789012")).toBe(false);
    expect(isValidCpfOrCnpj("1234567890123")).toBe(false);
  });

  it("rejeita CPF/CNPJ com DV errado mesmo no tamanho certo", () => {
    expect(isValidCpfOrCnpj("52998224726")).toBe(false);
    expect(isValidCpfOrCnpj("12345678000190")).toBe(false);
  });
});

describe("formatCpfOrCnpj / normalizeCpfOrCnpj", () => {
  it("escolhe máscara baseada na qtd de dígitos", () => {
    expect(formatCpfOrCnpj("52998224725")).toBe("529.982.247-25");
    expect(formatCpfOrCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("normaliza só pra dígitos", () => {
    expect(normalizeCpfOrCnpj("529.982.247-25")).toBe("52998224725");
    expect(normalizeCpfOrCnpj("11.222.333/0001-81")).toBe("11222333000181");
  });
});

describe("normalizePhoneBR / isValidPhoneBR", () => {
  it("normaliza celular 11 dígitos pra 55DDD9XXXXXXXX", () => {
    expect(normalizePhoneBR("(33) 99999-1234")).toBe("5533999991234");
    expect(normalizePhoneBR("33999991234")).toBe("5533999991234");
  });

  it("normaliza fixo 10 dígitos pra 55DDDXXXXXXXX", () => {
    expect(normalizePhoneBR("(33) 3333-4444")).toBe("553333334444");
    expect(normalizePhoneBR("3333334444")).toBe("553333334444");
  });

  it("mantém formato com DDI 55 já presente", () => {
    expect(normalizePhoneBR("5533999991234")).toBe("5533999991234");
    expect(normalizePhoneBR("+55 33 99999-1234")).toBe("5533999991234");
  });

  it("retorna null pra entradas impossíveis", () => {
    expect(normalizePhoneBR("")).toBeNull();
    expect(normalizePhoneBR(null)).toBeNull();
    expect(normalizePhoneBR("123")).toBeNull();
    // 12 dígitos mas não começa com 55
    expect(normalizePhoneBR("123456789012")).toBeNull();
  });

  it("aceita celular válido (terceiro dígito 9)", () => {
    expect(isValidPhoneBR("(33) 99999-1234")).toBe(true);
    expect(isValidPhoneBR("11987654321")).toBe(true);
  });

  it("aceita fixo válido (terceiro dígito 2-5)", () => {
    expect(isValidPhoneBR("(33) 3333-4444")).toBe(true);
    expect(isValidPhoneBR("3322334455")).toBe(true);
  });

  it("rejeita celular com terceiro dígito diferente de 9", () => {
    // 11 dígitos mas o terceiro é 8 (não-9)
    expect(isValidPhoneBR("33899991234")).toBe(false);
  });

  it("rejeita fixo com terceiro dígito fora de 2-5", () => {
    expect(isValidPhoneBR("3363334444")).toBe(false);
    expect(isValidPhoneBR("3313334444")).toBe(false);
  });

  it("rejeita DDD inválido (< 11)", () => {
    expect(isValidPhoneBR("10999991234")).toBe(false);
    expect(isValidPhoneBR("09999991234")).toBe(false);
  });
});

describe("formatPhoneBR", () => {
  it("aplica máscara celular progressivamente", () => {
    expect(formatPhoneBR("3")).toBe("(3");
    expect(formatPhoneBR("33")).toBe("(33");
    expect(formatPhoneBR("3399")).toBe("(33) 99");
    expect(formatPhoneBR("3399999")).toBe("(33) 9999-9");
    expect(formatPhoneBR("33999991234")).toBe("(33) 99999-1234");
  });

  it("aplica máscara fixo (10 dígitos)", () => {
    expect(formatPhoneBR("3333334444")).toBe("(33) 3333-4444");
  });

  it("retira DDI 55 quando presente no preview", () => {
    expect(formatPhoneBR("5533999991234")).toBe("(33) 99999-1234");
  });
});

describe("toWhatsAppE164 / buildWhatsAppLink", () => {
  it("toWhatsAppE164 retorna +55... quando válido", () => {
    expect(toWhatsAppE164("(33) 99999-1234")).toBe("+5533999991234");
  });

  it("toWhatsAppE164 retorna null quando inválido", () => {
    expect(toWhatsAppE164("")).toBeNull();
    expect(toWhatsAppE164("123")).toBeNull();
  });

  it("buildWhatsAppLink monta wa.me com texto encoded", () => {
    const link = buildWhatsAppLink("33999991234", "Olá produtor");
    expect(link).toBe("https://wa.me/5533999991234?text=Ol%C3%A1%20produtor");
  });

  it("buildWhatsAppLink retorna null se telefone inválido", () => {
    // 11 dígitos mas celular sem 9 → inválido
    expect(buildWhatsAppLink("33899991234", "oi")).toBeNull();
    expect(buildWhatsAppLink(null, "oi")).toBeNull();
  });
});

describe("UF", () => {
  it("UFS tem 27 entradas únicas", () => {
    expect(UFS.length).toBe(27);
    expect(new Set(UFS).size).toBe(27);
  });

  it("isValidUF aceita todas as 27 UFs (case-insensitive)", () => {
    for (const uf of UFS) {
      expect(isValidUF(uf)).toBe(true);
      expect(isValidUF(uf.toLowerCase())).toBe(true);
    }
  });

  it("isValidUF rejeita inválido", () => {
    expect(isValidUF("XX")).toBe(false);
    expect(isValidUF("")).toBe(false);
    expect(isValidUF(null)).toBe(false);
    expect(isValidUF("MGS")).toBe(false);
  });

  it("normalizeUF retorna uppercase ou null", () => {
    expect(normalizeUF("mg")).toBe("MG");
    expect(normalizeUF(" sp ")).toBe("SP");
    expect(normalizeUF("xx")).toBeNull();
    expect(normalizeUF("")).toBeNull();
  });
});

describe("city", () => {
  it("formatCityName remove espaços extras", () => {
    expect(formatCityName("  Manhuaçu  ")).toBe("Manhuaçu");
    expect(formatCityName("São   João  del-Rei")).toBe("São João del-Rei");
    expect(formatCityName("")).toBe("");
    expect(formatCityName(null)).toBe("");
  });

  it("isValidCityName aceita nomes brasileiros plausíveis", () => {
    expect(isValidCityName("Manhuaçu")).toBe(true);
    expect(isValidCityName("São João del-Rei")).toBe(true);
    expect(isValidCityName("Foz d'Iguaçu")).toBe(true);
    expect(isValidCityName("Vitória")).toBe(true);
  });

  it("isValidCityName rejeita curtos demais", () => {
    expect(isValidCityName("A")).toBe(false);
    expect(isValidCityName("")).toBe(false);
  });

  it("isValidCityName rejeita números e caracteres especiais", () => {
    expect(isValidCityName("Cidade 123")).toBe(false);
    expect(isValidCityName("<script>")).toBe(false);
    expect(isValidCityName("Cidade [SP]")).toBe(false);
    expect(isValidCityName("Cidade@Exemplo")).toBe(false);
  });

  it("isValidCityName rejeita acima de 100 caracteres", () => {
    expect(isValidCityName("a".repeat(101))).toBe(false);
  });
});
