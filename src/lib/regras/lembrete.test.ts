import { describe, expect, it } from "vitest";
import { lerLembrete, rotuloAntecedencia } from "./lembrete";

describe("lembrete", () => {
  it("aceita as antecedências da lista e o desligado", () => {
    expect(lerLembrete("24")).toEqual({ ok: true, valor: { lembrete_horas: 24 } });
    expect(lerLembrete("2")).toEqual({ ok: true, valor: { lembrete_horas: 2 } });
    expect(lerLembrete("desligado")).toEqual({ ok: true, valor: { lembrete_horas: null } });
  });
  it("recusa o que não está na lista", () => {
    for (const v of ["5", "", "0", "24.5", "abc"]) expect(lerLembrete(v).ok).toBe(false);
  });
  it("rótulos", () => {
    expect(rotuloAntecedencia(null)).toBe("Desligado");
    expect(rotuloAntecedencia(24)).toBe("1 dia antes (24 horas)");
    expect(rotuloAntecedencia(4)).toBe("4 horas antes");
  });
});
