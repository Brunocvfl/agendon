import { describe, expect, it } from "vitest";
import {
  dataNoFuso,
  ehData,
  ehHora,
  formatarData,
  formatarDiaMes,
  formatarMesAno,
  horaNoFuso,
  partesDaData,
  periodoLegivel,
  quando,
  rotuloData,
} from "./datas";

const SP = "America/Sao_Paulo"; // −3
const MANAUS = "America/Manaus"; // −4
const NORONHA = "America/Noronha"; // −2

describe("validação", () => {
  it.each(["00:00", "09:30", "23:59"])("%s é hora", (h) => expect(ehHora(h)).toBe(true));
  it.each(["24:00", "99:99", "9:30", "09:60", "", "09:30:00"])("%s não é hora", (h) => expect(ehHora(h)).toBe(false));
  it("data existe no calendário", () => {
    expect(ehData("2028-02-29")).toBe(true);
    expect(ehData("2026-02-29")).toBe(false);
  });
});

describe("instante no fuso do salão", () => {
  it("vira o dia antes do UTC", () => {
    expect(dataNoFuso("2026-11-20T02:30:00Z", SP)).toBe("2026-11-19");
    expect(horaNoFuso("2026-11-20T02:30:00Z", SP)).toBe("23:30");
  });

  it("cada fuso do Brasil tem a sua hora", () => {
    const instante = "2026-11-20T03:30:00Z";
    expect([horaNoFuso(instante, MANAUS), horaNoFuso(instante, SP), horaNoFuso(instante, NORONHA)]).toEqual([
      "23:30",
      "00:30",
      "01:30",
    ]);
    expect(dataNoFuso(instante, MANAUS)).toBe("2026-11-19");
    expect(dataNoFuso(instante, SP)).toBe("2026-11-20");
  });

  it("quando: dia e hora para telas e mensagens", () => {
    expect(quando("2026-11-12T18:30:00Z", SP)).toBe("qui, 12 nov às 15:30");
    expect(quando("2026-11-13T01:00:00Z", SP)).toBe("qui, 12 nov às 22:00");
  });
});

describe("rótulos de data", () => {
  it("partes e rótulo completo", () => {
    expect(partesDaData("2026-11-11")).toEqual({ semana: "qua", dia: "11 nov" });
    expect(rotuloData("2026-11-11")).toBe("qua, 11 nov");
    expect(rotuloData("2026-12-02")).toBe("qua, 02 dez");
  });

  it("datas curtas do painel", () => {
    expect(formatarDiaMes("2026-12-01T02:00:00Z", SP)).toBe("30 nov");
    expect(formatarMesAno("2026-12-01T02:00:00Z", SP)).toBe("nov/2026");
    expect(formatarData("2026-12-01T02:00:00Z", SP)).toBe("30/11/2026");
  });
});

describe("periodoLegivel (folgas, gravadas em UTC)", () => {
  it.each([
    ["um dia inteiro", "2026-11-19T03:00:00Z", "2026-11-20T03:00:00Z", "qui, 19 nov"],
    ["dias no mesmo mês", "2026-11-19T03:00:00Z", "2026-11-22T03:00:00Z", "19 a 21 nov"],
    ["dias atravessando o mês", "2026-11-28T03:00:00Z", "2026-12-03T03:00:00Z", "28 nov a 02 dez"],
    ["horário no mesmo dia", "2026-11-19T17:00:00Z", "2026-11-19T19:00:00Z", "qui, 19 nov · 14:00–16:00"],
    ["horário atravessando a meia-noite", "2026-11-20T01:00:00Z", "2026-11-20T05:00:00Z", "qui, 19 nov 22:00 até sex, 20 nov 02:00"],
  ])("%s", (_caso, inicio, fim, texto) => expect(periodoLegivel(inicio, fim, SP)).toBe(texto));

  it("dia inteiro depende do fuso do salão", () => {
    expect(periodoLegivel("2026-11-19T04:00:00Z", "2026-11-20T04:00:00Z", MANAUS)).toBe("qui, 19 nov");
  });
});
