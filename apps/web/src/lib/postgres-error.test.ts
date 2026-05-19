import { describe, it, expect } from "vitest";
import { friendlyPostgresError } from "./postgres-error";

describe("friendlyPostgresError", () => {
  it("retorna fallback quando error é null", () => {
    expect(friendlyPostgresError(null)).toContain("Não foi possível");
    expect(friendlyPostgresError(undefined)).toContain("Não foi possível");
  });

  it("permite fallback custom", () => {
    expect(friendlyPostgresError(null, "ops")).toBe("ops");
  });

  it("mapeia 23505 (unique violation) → mensagem cnpj quando msg menciona cnpj", () => {
    const result = friendlyPostgresError({
      code: "23505",
      message: 'duplicate key value violates unique constraint "corretoras_cnpj_unique"',
    });
    expect(result).toContain("CNPJ");
  });

  it("mapeia 23505 com slug", () => {
    const result = friendlyPostgresError({
      code: "23505",
      message: 'duplicate key value: corretoras_slug_key (slug)',
    });
    expect(result).toContain("slug");
  });

  it("mapeia 23505 com email", () => {
    const result = friendlyPostgresError({
      code: "23505",
      message: 'duplicate key on email',
    });
    expect(result).toContain("e-mail");
  });

  it("mapeia 23505 genérico quando msg não tem hint", () => {
    const result = friendlyPostgresError({
      code: "23505",
      message: "duplicate key value violates unique constraint",
    });
    expect(result).toContain("Já existe");
  });

  it("mapeia 23503 (foreign key)", () => {
    const result = friendlyPostgresError({
      code: "23503",
      message: "violates foreign key constraint",
    });
    expect(result.toLowerCase()).toContain("referência inválida");
  });

  it("mapeia 23502 (not null)", () => {
    const result = friendlyPostgresError({
      code: "23502",
      message: 'null value in column "name"',
    });
    expect(result.toLowerCase()).toContain("obrigatórios");
  });

  it("mapeia 23514 (check violation)", () => {
    const result = friendlyPostgresError({
      code: "23514",
      message: "new row for relation violates check constraint",
    });
    expect(result.toLowerCase()).toContain("não é permitido");
  });

  it("mapeia 42501 (permission denied)", () => {
    const result = friendlyPostgresError({
      code: "42501",
      message: "permission denied for table",
    });
    expect(result.toLowerCase()).toContain("permissão");
  });

  it("mapeia row-level security via mensagem", () => {
    const result = friendlyPostgresError({
      message: "new row violates row-level security policy for table",
    });
    expect(result.toLowerCase()).toContain("permissão");
  });

  it("mapeia forbidden via mensagem (RPC custom)", () => {
    const result = friendlyPostgresError({
      message: "forbidden",
    });
    expect(result.toLowerCase()).toContain("permissão");
  });

  it("não vaza texto cru de erro desconhecido", () => {
    const internal = "FATAL: stack trace at pg_internal_func()";
    const result = friendlyPostgresError({
      code: "XX000",
      message: internal,
    });
    expect(result).not.toContain(internal);
    expect(result).not.toContain("stack");
    expect(result).not.toContain("pg_internal");
  });
});
