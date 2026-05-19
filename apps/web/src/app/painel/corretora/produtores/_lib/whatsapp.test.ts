import { describe, it, expect } from "vitest";
import {
  buildWhatsAppInviteUrl,
  defaultInviteMessage,
  normalizePhoneBR,
} from "./whatsapp";

describe("normalizePhoneBR", () => {
  it("retorna null pra entrada vazia/undefined", () => {
    expect(normalizePhoneBR(null)).toBeNull();
    expect(normalizePhoneBR(undefined)).toBeNull();
    expect(normalizePhoneBR("")).toBeNull();
    expect(normalizePhoneBR("abc")).toBeNull();
  });

  it("adiciona DDI 55 em telefone 11 dígitos (celular)", () => {
    expect(normalizePhoneBR("33999999999")).toBe("5533999999999");
  });

  it("adiciona DDI 55 em telefone 10 dígitos (fixo)", () => {
    expect(normalizePhoneBR("3333333333")).toBe("553333333333");
  });

  it("mantém DDI 55 quando já tem 12 ou 13 dígitos", () => {
    expect(normalizePhoneBR("553333333333")).toBe("553333333333");
    expect(normalizePhoneBR("5533999999999")).toBe("5533999999999");
  });

  it("remove caracteres não-numéricos antes de validar", () => {
    expect(normalizePhoneBR("(33) 99999-9999")).toBe("5533999999999");
    expect(normalizePhoneBR("+55 33 99999-9999")).toBe("5533999999999");
    expect(normalizePhoneBR("33 9 9999-9999")).toBe("5533999999999");
  });

  it("rejeita telefones muito curtos ou muito longos", () => {
    expect(normalizePhoneBR("123")).toBeNull();
    expect(normalizePhoneBR("123456789")).toBeNull();
    expect(normalizePhoneBR("12345678901234")).toBeNull();
  });
});

describe("buildWhatsAppInviteUrl", () => {
  it("retorna null quando phone inválido", () => {
    expect(buildWhatsAppInviteUrl({ phone: null, message: "oi" })).toBeNull();
    expect(buildWhatsAppInviteUrl({ phone: "abc", message: "oi" })).toBeNull();
  });

  it("monta URL wa.me com phone normalizado e mensagem encoded", () => {
    const url = buildWhatsAppInviteUrl({
      phone: "(33) 99999-9999",
      message: "Olá, tudo bem?",
    });
    expect(url).toBe(
      "https://wa.me/5533999999999?text=Ol%C3%A1%2C%20tudo%20bem%3F",
    );
  });

  it("encoda caracteres especiais que quebrariam o URL", () => {
    const url = buildWhatsAppInviteUrl({
      phone: "5533999999999",
      message: "100% & 50?",
    });
    expect(url).toContain("100%25%20%26%2050%3F");
  });
});

describe("defaultInviteMessage", () => {
  it("inclui primeiro nome do produtor quando tem espaço", () => {
    const msg = defaultInviteMessage({
      corretoraNome: "Café & Cia",
      produtorNome: "João da Silva",
      siteUrl: "https://milsaca.app",
    });
    expect(msg).toContain("Olá, João!");
    expect(msg).toContain("Café & Cia");
    expect(msg).toContain("https://milsaca.app/entrar");
  });

  it("usa nome completo quando não tem espaço", () => {
    const msg = defaultInviteMessage({
      corretoraNome: "X",
      produtorNome: "Maria",
      siteUrl: "https://milsaca.app",
    });
    expect(msg).toContain("Olá, Maria!");
  });
});
