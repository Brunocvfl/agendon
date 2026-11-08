// Resultado de uma regra de cadastro: valor válido ou mensagens de erro por campo.
export type ErrosPorCampo = Record<string, string>;
export type Resultado<T> = { ok: true; valor: T } | { ok: false; erros: ErrosPorCampo };

export const valido = <T>(valor: T): Resultado<T> => ({ ok: true, valor });
export const invalido = <T = never>(erros: ErrosPorCampo): Resultado<T> => ({ ok: false, erros });

// Texto digitado: sem espaços nas pontas e sem espaços repetidos.
export const limparTexto = (texto: string | undefined) => (texto ?? "").trim().replace(/\s+/g, " ");
