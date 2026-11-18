// CSV para abrir no Excel em português: separador ";", UTF-8 com BOM (acentos certos) e CRLF.
// Célula que começa com = + - @ (ou tab/CR) ganha um apóstrofo na frente, para a planilha não
// executar como fórmula um texto digitado por terceiros (ex.: nome na página pública).

const PERIGOSO = /^[=+\-@\t\r]/;

function celula(valor: string | number | null | undefined): string {
  let texto = valor === null || valor === undefined ? "" : String(valor);
  if (PERIGOSO.test(texto)) texto = `'${texto}`;
  return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function paraCsv(cabecalho: string[], linhas: (string | number | null | undefined)[][]): string {
  return "﻿" + [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n") + "\r\n";
}
