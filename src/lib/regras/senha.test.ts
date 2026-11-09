import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { erroDaSenha, LIMITES_SENHA, requisitosDaSenha } from "./senha";

describe("requisitosDaSenha", () => {
  it("marca cada requisito", () => {
    const r = Object.fromEntries(requisitosDaSenha("abcdefghi1").map((x) => [x.id, x.ok]));
    expect(r).toEqual({ tamanho: true, maiuscula: false, minuscula: true, numero: true });
  });
});

describe("erroDaSenha", () => {
  it("aceita senha forte", () => {
    expect(erroDaSenha("Salao2026bela")).toBeNull();
    expect(erroDaSenha("Salao2026bela", "Salao2026bela")).toBeNull();
  });
  it.each([
    ["Curta1A", "pelo menos 10 caracteres"],
    ["semmaiuscula1", "uma letra maiúscula"],
    ["SEMMINUSCULA1", "uma letra minúscula"],
    ["SemNumeroAqui", "um número"],
  ])("recusa %s", (senha, falta) => {
    expect(erroDaSenha(senha)).toContain(falta);
  });
  it("lista tudo o que falta", () => {
    expect(erroDaSenha("abc")).toBe(
      "A senha precisa ter: pelo menos 10 caracteres, uma letra maiúscula, um número.",
    );
  });
  it("recusa repetição diferente", () => {
    expect(erroDaSenha("Salao2026bela", "Salao2026Bela")).toBe("As duas senhas não são iguais.");
  });
  it("recusa senha longa demais", () => {
    expect(erroDaSenha(`Aa1${"x".repeat(LIMITES_SENHA.max)}`)).toContain("no máximo");
  });
});

describe("espelha o Auth do Supabase", () => {
  it("mesmo tamanho mínimo e requisitos do config.toml", () => {
    const toml = readFileSync(fileURLToPath(new URL("../../../supabase/config.toml", import.meta.url)), "utf8");
    expect(toml).toMatch(new RegExp(`^minimum_password_length = ${LIMITES_SENHA.min}$`, "m"));
    expect(toml).toMatch(/^password_requirements = "lower_upper_letters_digits"$/m);
  });
});
