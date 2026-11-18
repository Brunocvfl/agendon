import { describe, expect, it } from "vitest";
import { ehCaminhoDeFoto } from "./foto";

describe("foto do profissional", () => {
  const salao = "00000000-0000-4000-a000-000000000001";
  const prof = "00000000-0000-4000-a000-000000000002";
  it("aceita só o caminho que o app gera, na pasta do salão e do profissional", () => {
    expect(ehCaminhoDeFoto(salao, prof, `${salao}/prof-${prof}-1763500000000.jpg`)).toBe(true);
    expect(ehCaminhoDeFoto(salao, prof, `${salao}/prof-${salao}-1763500000000.jpg`)).toBe(false);
    expect(ehCaminhoDeFoto(salao, prof, `outro/prof-${prof}-1763500000000.jpg`)).toBe(false);
    expect(ehCaminhoDeFoto(salao, prof, `${salao}/prof-${prof}-1763500000000.gif`)).toBe(false);
  });
});
