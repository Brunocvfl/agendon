import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { lerServico } from "./servico";
import { lerNomeProfissional } from "./profissional";
import { lerFolga } from "./folga";
import { lerSalao, normalizarSlug, SLUGS_RESERVADOS } from "./salao";

describe("lerServico", () => {
  it("aceita e normaliza", () => {
    expect(lerServico({ nome: "  Corte   feminino ", duracao: "60", preco: "89,90" })).toEqual({
      ok: true,
      valor: { nome: "Corte feminino", duracao_min: 60, preco: 89.9 },
    });
  });
  it("lê preço com milhar", () => {
    const r = lerServico({ nome: "Mega hair", duracao: "240", preco: "1.095,00" });
    expect(r.ok && r.valor.preco).toBe(1095);
  });
  it("aponta cada campo inválido", () => {
    const r = lerServico({ nome: "X", duracao: "3", preco: "noventa" });
    expect(r.ok).toBe(false);
    expect(Object.keys(!r.ok ? r.erros : {}).sort()).toEqual(["duracao", "nome", "preco"]);
  });
  it("recusa duração quebrada e acima do limite", () => {
    expect(lerServico({ nome: "Corte", duracao: "30.5", preco: "10" }).ok).toBe(false);
    expect(lerServico({ nome: "Corte", duracao: "721", preco: "10" }).ok).toBe(false);
  });
});

describe("lerNomeProfissional", () => {
  it("limpa espaços", () => expect(lerNomeProfissional("  Ana   Lima ")).toEqual({ ok: true, valor: "Ana Lima" }));
  it("recusa nome curto", () => expect(lerNomeProfissional(" A ").ok).toBe(false));
});

describe("lerFolga", () => {
  it("aceita período válido e corta o motivo em 80", () => {
    const r = lerFolga({ inicio: "2026-12-01T14:00", fim: "2026-12-01T16:00", motivo: "x".repeat(100) });
    expect(r.ok && r.valor.motivo.length).toBe(80);
  });
  it("recusa fim antes do começo", () => {
    expect(lerFolga({ inicio: "2026-12-01T16:00", fim: "2026-12-01T14:00" })).toEqual({
      ok: false,
      erros: { periodo: "O fim precisa ser depois do começo." },
    });
  });
  it("recusa data incompleta", () => expect(lerFolga({ inicio: "2026-12-01", fim: "" }).ok).toBe(false));
});

describe("lerSalao", () => {
  it("normaliza o endereço", () => {
    expect(normalizarSlug("  Studio Bela Vida Ação! ")).toBe("studio-bela-vida-acao");
    expect(lerSalao({ nome: "Studio", slug: "Studio-Bela" })).toEqual({ ok: true, valor: { nome: "Studio", slug: "studio-bela" } });
  });
  it("recusa endereço reservado e curto", () => {
    expect(lerSalao({ nome: "Painel", slug: "painel" }).ok).toBe(false);
    expect(lerSalao({ nome: "Studio", slug: "ab" }).ok).toBe(false);
  });
  it("lista de reservados é igual à do banco (migration de onboarding)", () => {
    const sql = readFileSync(
      fileURLToPath(new URL("../../../supabase/migrations/20261108000001_onboarding.sql", import.meta.url)),
      "utf8",
    );
    const bloco = sql.match(/select p_slug = any \(array\[([\s\S]*?)\]\)/)?.[1] ?? "";
    const doBanco = [...bloco.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
    expect([...SLUGS_RESERVADOS].sort()).toEqual(doBanco);
  });
});
