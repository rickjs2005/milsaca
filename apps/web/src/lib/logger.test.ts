import { describe, it, expect, vi, afterEach } from "vitest";
import { redact, safeError, logger } from "./logger";

describe("redact — masking de PII", () => {
  it("mascara chave de PII no topo", () => {
    expect(redact({ email: "joao@x.com" })).toEqual({ email: "[redacted]" });
  });

  it("mascara PII ANINHADA (recursivo)", () => {
    expect(redact({ user: { email: "a@b.com", id: "u1" } })).toEqual({
      user: { email: "[redacted]", id: "u1" },
    });
  });

  it("pega nomes compostos por token (userEmail, access_token, refresh_token)", () => {
    expect(
      redact({ userEmail: "a@b.com", access_token: "t", refresh_token: "r" }),
    ).toEqual({ userEmail: "[redacted]", access_token: "[redacted]", refresh_token: "[redacted]" });
  });

  it("NÃO mascara chaves seguras (corretoraId, reqId, code, status)", () => {
    expect(
      redact({ corretoraId: "c1", reqId: "r1", code: "23505", status: "ativo" }),
    ).toEqual({ corretoraId: "c1", reqId: "r1", code: "23505", status: "ativo" });
  });

  it("NÃO tem falso-positivo de substring (description contém 'ip')", () => {
    expect(redact({ description: "qualquer texto" })).toEqual({
      description: "qualquer texto",
    });
  });

  it("faz scrub de PII embutida em string de valor", () => {
    expect(redact({ note: "falha para joao@x.com no CPF 123.456.789-09" })).toEqual({
      note: "falha para [email] no CPF [cpf]",
    });
  });

  it("limita profundidade e arrays", () => {
    const deep = { a: { b: { c: { d: { e: "x" } } } } };
    expect(redact(deep)).toEqual({ a: { b: { c: { d: "[depth-limit]" } } } });
  });
});

describe("safeError", () => {
  it("serializa Error sem stack em produção", () => {
    const prev = process.env.NODE_ENV;
    vi.stubEnv("NODE_ENV", "production");
    const out = safeError(new Error("boom joao@x.com"));
    expect(out).toEqual({ name: "Error", message: "boom [email]" });
    vi.stubEnv("NODE_ENV", prev ?? "test");
  });

  it("erro tipo Postgrest expõe só code+message (NUNCA details/hint)", () => {
    const pg = {
      code: "23505",
      message: "duplicate key",
      details: "Key (email)=(joao@x.com) already exists.",
      hint: "alguma dica",
    };
    expect(safeError(pg)).toEqual({ code: "23505", message: "duplicate key" });
  });
});

describe("logger — níveis e rota de stream", () => {
  afterEach(() => vi.restoreAllMocks());

  it("fatal existe e vai pro console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.fatal("integridade_perdida", { corretoraId: "c1" });
    expect(spy).toHaveBeenCalledOnce();
    const rec = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(rec.level).toBe("fatal");
    expect(rec.corretoraId).toBe("c1");
  });

  it("child injeta bindings em toda linha", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.child({ reqId: "r1", action: "x" }).error("falhou", { code: "1" });
    const rec = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(rec).toMatchObject({ reqId: "r1", action: "x", code: "1", msg: "falhou" });
  });

  it("debug é suprimido em produção", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "production");
    logger.debug("nao_deve_sair");
    expect(spy).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});
