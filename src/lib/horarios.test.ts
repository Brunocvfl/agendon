import { describe, expect, it } from "vitest";
import { faixasParaTela, telaParaFaixas, type DiaTela } from "./horarios";

const dia = (d: Partial<DiaTela> & { dia: number }): DiaTela => ({
  trabalha: true,
  inicio: "09:00",
  fim: "18:00",
  intervaloInicio: "",
  intervaloFim: "",
  ...d,
});

describe("horário semanal", () => {
  it("pausa vira duas faixas e volta igual", () => {
    const tela = [dia({ dia: 2, intervaloInicio: "12:00", intervaloFim: "13:00" })];
    const { faixas, erros } = telaParaFaixas(tela);
    expect(erros).toEqual({});
    expect(faixas).toEqual([
      { dia: 2, inicio: "09:00", fim: "12:00" },
      { dia: 2, inicio: "13:00", fim: "18:00" },
    ]);
    const volta = faixasParaTela(faixas.map((f) => ({ ...f, inicio: `${f.inicio}:00`, fim: `${f.fim}:00` })));
    expect(volta.find((d) => d.dia === 2)).toEqual(tela[0]);
  });

  it("dia sem faixas aparece como não atende", () => {
    expect(faixasParaTela([]).every((d) => !d.trabalha)).toBe(true);
  });

  it("pausa fora do expediente é erro do dia", () => {
    const { erros } = telaParaFaixas([dia({ dia: 6, fim: "11:00", intervaloInicio: "12:00", intervaloFim: "13:00" })]);
    expect(erros[6]).toMatch(/pausa/);
  });

  it("pausa pela metade é erro", () => {
    const { erros } = telaParaFaixas([dia({ dia: 3, intervaloInicio: "12:00" })]);
    expect(erros[3]).toBeDefined();
  });

  it("fim antes do início é erro", () => {
    expect(telaParaFaixas([dia({ dia: 1, inicio: "18:00", fim: "09:00" })]).erros[1]).toBeDefined();
  });
});
