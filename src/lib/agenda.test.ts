import { describe, expect, it } from "vitest";
import { faixasEmMinutos, ladoALado, periodoNoDia, regua, semAtendimento } from "./agenda";
import { dataNoFuso, diaDaSemana, ehData, minutosNoFuso, paraHora, rotuloData, somarDias } from "./datas";

const SP = "America/Sao_Paulo";

describe("datas", () => {
  it("ehData", () => {
    expect(ehData("2026-02-28")).toBe(true);
    expect(ehData("2026-02-30")).toBe(false);
    expect(ehData("2026-2-1")).toBe(false);
  });
  it("somarDias vira mês e ano", () => {
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("diaDaSemana (0 = domingo)", () => expect(diaDaSemana("2026-11-08")).toBe(0));
  it("data e minutos no fuso do salão", () => {
    expect(dataNoFuso("2026-12-01T02:30:00Z", SP)).toBe("2026-11-30");
    expect(minutosNoFuso("2026-12-01T02:30:00Z", SP)).toBe(23 * 60 + 30);
  });
  it("paraHora", () => expect(paraHora(570)).toBe("09:30"));
  it("rotuloData", () => expect(rotuloData("2026-11-11")).toBe("qua, 11 nov"));
});

describe("regua", () => {
  it("padrão 08h–19h", () => expect(regua([])).toEqual({ de: 480, ate: 1140 }));
  it("amplia em horas cheias", () => expect(regua([{ de: 7 * 60 + 30, ate: 20 * 60 + 15 }])).toEqual({ de: 420, ate: 1260 }));
});

describe("semAtendimento", () => {
  const r = { de: 480, ate: 1140 };
  it("antes, intervalo e depois", () => {
    const faixas = faixasEmMinutos([
      { inicio: "13:00:00", fim: "18:00:00" },
      { inicio: "09:00:00", fim: "12:00:00" },
    ]);
    expect(semAtendimento(faixas, r)).toEqual([
      { de: 480, ate: 540, tipo: "fora" },
      { de: 720, ate: 780, tipo: "intervalo" },
      { de: 1080, ate: 1140, tipo: "fora" },
    ]);
  });
  it("sem expediente no dia: tudo fora", () => expect(semAtendimento([], r)).toEqual([{ ...r, tipo: "fora" }]));
});

describe("periodoNoDia", () => {
  it("no mesmo dia", () =>
    expect(periodoNoDia("2026-11-10T12:00:00Z", "2026-11-10T13:00:00Z", "2026-11-10", SP)).toEqual({ de: 540, ate: 600 }));
  it("corta o que passa da meia-noite", () =>
    expect(periodoNoDia("2026-11-11T02:00:00Z", "2026-11-11T04:00:00Z", "2026-11-10", SP)).toEqual({ de: 1380, ate: 1440 }));
});

describe("ladoALado", () => {
  it("sem sobreposição: uma coluna cada", () =>
    expect(ladoALado([{ de: 540, ate: 600 }, { de: 600, ate: 660 }])).toEqual([
      { coluna: 0, colunas: 1 },
      { coluna: 0, colunas: 1 },
    ]));
  it("sobrepostos dividem o grupo", () =>
    expect(ladoALado([{ de: 540, ate: 600 }, { de: 570, ate: 630 }, { de: 700, ate: 760 }])).toEqual([
      { coluna: 0, colunas: 2 },
      { coluna: 1, colunas: 2 },
      { coluna: 0, colunas: 1 },
    ]));
  it("reaproveita a coluna livre dentro do grupo", () =>
    // Mesmo início: o mais curto fica na primeira coluna, e o seguinte reaproveita essa coluna.
    expect(ladoALado([{ de: 540, ate: 660 }, { de: 540, ate: 570 }, { de: 580, ate: 600 }])).toEqual([
      { coluna: 1, colunas: 2 },
      { coluna: 0, colunas: 2 },
      { coluna: 0, colunas: 2 },
    ]));
});
