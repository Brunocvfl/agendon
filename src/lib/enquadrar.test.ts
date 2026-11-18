import { describe, expect, it } from "vitest";
import { limitar, recorte, ZOOM_MAXIMO, type Enquadramento } from "./enquadrar";

// Foto deitada 2000 × 1000 numa janela de 200 px: escala inicial 0,2 (a altura cobre a janela).
const base: Enquadramento = { largura: 2000, altura: 1000, janela: 200, zoom: 1, x: 0, y: 0 };

describe("enquadrar", () => {
  it("sem mexer, recorta o quadrado do centro", () => {
    expect(recorte(base)).toEqual({ x: 500, y: 0, lado: 1000 });
  });

  it("arrastar para a direita mostra a parte da esquerda, até a borda", () => {
    const e = limitar({ ...base, x: 1000 });
    expect(e.x).toBe(100); // (2000 × 0,2 − 200) / 2
    expect(recorte(e)).toEqual({ x: 0, y: 0, lado: 1000 });
  });

  it("sem zoom não dá para mover na vertical (a altura já é justa)", () => {
    expect(limitar({ ...base, y: 50 }).y).toBe(0);
  });

  it("com zoom 2 o recorte fica menor e pode subir e descer", () => {
    const e = limitar({ ...base, zoom: 2, y: -1000 });
    expect(e.y).toBe(-100); // (1000 × 0,4 − 200) / 2
    expect(recorte(e)).toEqual({ x: 750, y: 500, lado: 500 });
  });

  it("zoom fica entre 1 e o máximo", () => {
    expect(limitar({ ...base, zoom: 0.3 }).zoom).toBe(1);
    expect(limitar({ ...base, zoom: 99 }).zoom).toBe(ZOOM_MAXIMO);
  });

  it("diminuir o zoom puxa a imagem de volta para cobrir a janela", () => {
    const longe = limitar({ ...base, zoom: 3, x: 500 });
    expect(limitar({ ...longe, zoom: 1 }).x).toBe(100);
  });
});
