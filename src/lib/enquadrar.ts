// Enquadrar uma foto num quadrado (foto do profissional): zoom e posição escolhidos pela pessoa.
// A imagem cobre sempre a janela inteira (sem bordas vazias). Puro: o componente desenha e o
// canvas recorta com `recorte()`.

export type Enquadramento = {
  /** Tamanho natural da imagem, em px. */
  largura: number;
  altura: number;
  /** Lado da janela quadrada na tela, em px. */
  janela: number;
  /** 1 = a imagem só cobre a janela; até ZOOM_MAXIMO. */
  zoom: number;
  /** Deslocamento do centro da imagem em relação ao centro da janela, em px da tela. */
  x: number;
  y: number;
};

export const ZOOM_MAXIMO = 4;

/** Escala da imagem na tela: a menor que cobre a janela, vezes o zoom. */
export function escala(e: Pick<Enquadramento, "largura" | "altura" | "janela" | "zoom">): number {
  return Math.max(e.janela / e.largura, e.janela / e.altura) * e.zoom;
}

/** Ajusta zoom e deslocamento para a imagem continuar cobrindo a janela. */
export function limitar(e: Enquadramento): Enquadramento {
  const zoom = Math.min(Math.max(e.zoom, 1), ZOOM_MAXIMO);
  const s = escala({ ...e, zoom });
  const folgaX = (e.largura * s - e.janela) / 2;
  const folgaY = (e.altura * s - e.janela) / 2;
  const prender = (v: number, folga: number) => Math.min(Math.max(v, -folga), folga) || 0;
  return { ...e, zoom, x: prender(e.x, folgaX), y: prender(e.y, folgaY) };
}

/** Parte da imagem original (px naturais) que aparece na janela: o quadrado a recortar. */
export function recorte(e: Enquadramento): { x: number; y: number; lado: number } {
  const s = escala(e);
  const lado = e.janela / s;
  return {
    x: e.largura / 2 - (e.janela / 2 + e.x) / s,
    y: e.altura / 2 - (e.janela / 2 + e.y) / s,
    lado,
  };
}
