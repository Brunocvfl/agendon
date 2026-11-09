// Regras do Cliente (espelham as restrições do banco: clients_nome_tamanho, clients_observacoes_tamanho,
// clients_telefone_obrigatorio e o formato E.164 de clients.telefone).
import { invalido, limparTexto, valido, type ErrosPorCampo, type Resultado } from "./resultado";

export const LIMITES_CLIENTE = {
  nome: { min: 2, max: 80 },
  observacoes: { max: 500 },
} as const;

export type ClienteValido = { nome: string; telefone: string; observacoes: string | null };

/**
 * WhatsApp digitado -> E.164 ("+5511987654321"), ou null se não for um número válido.
 * Sem "+", o número é tratado como brasileiro: DDD + 8 ou 9 dígitos, com ou sem 0 e 55 na frente.
 * Com "+", aceita qualquer país no formato E.164.
 */
export function lerTelefone(texto: string): string | null {
  const t = texto.trim();
  let digitos = t.replace(/\D/g, "");
  if (!digitos) return null;

  if (t.startsWith("+")) {
    if (digitos.startsWith("55")) return telefoneBr(digitos.slice(2));
    return /^[1-9]\d{7,14}$/.test(digitos) ? `+${digitos}` : null;
  }

  digitos = digitos.replace(/^0+/, ""); // 0 de longa distância ("011 ...")
  if (digitos.length >= 12 && digitos.startsWith("55")) digitos = digitos.slice(2);
  return telefoneBr(digitos);
}

// DDD (11 a 99) + celular com 9 dígitos começando por 9, ou fixo com 8 dígitos começando de 2 a 5.
function telefoneBr(numero: string): string | null {
  const ok = /^[1-9][1-9]9\d{8}$/.test(numero) || /^[1-9][1-9][2-5]\d{7}$/.test(numero);
  return ok ? `+55${numero}` : null;
}

export function lerCliente(entrada: { nome?: string; telefone?: string; observacoes?: string }): Resultado<ClienteValido> {
  const { nome: n, observacoes: o } = LIMITES_CLIENTE;
  const erros: ErrosPorCampo = {};

  const nome = limparTexto(entrada.nome);
  if (nome.length < n.min || nome.length > n.max) erros.nome = `Use de ${n.min} a ${n.max} caracteres.`;

  const telefone = lerTelefone(entrada.telefone ?? "");
  if (!telefone) erros.telefone = "Informe o WhatsApp com DDD, por exemplo (11) 98765-4321.";

  // Observações: mantém as quebras de linha, só tira espaços nas pontas.
  const observacoes = (entrada.observacoes ?? "").trim();
  if (observacoes.length > o.max) erros.observacoes = `Use até ${o.max} caracteres.`;

  return Object.keys(erros).length > 0
    ? invalido(erros)
    : valido({ nome, telefone: telefone!, observacoes: observacoes || null });
}

/** Nome do arquivo da exportação (LGPD): "cliente-marina-lima-2026-11-09.json", só ASCII. */
export function arquivoDaExportacao(nome: string, data: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return `cliente-${base || "dados"}-${data}.json`;
}
