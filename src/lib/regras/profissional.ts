// Regras do Profissional (espelham professionals_nome_tamanho no banco).
import { invalido, limparTexto, valido, type Resultado } from "./resultado";

export const LIMITES_PROFISSIONAL = { nome: { min: 2, max: 60 } } as const;

export function lerNomeProfissional(texto: string | undefined): Resultado<string> {
  const { min, max } = LIMITES_PROFISSIONAL.nome;
  const nome = limparTexto(texto);
  return nome.length < min || nome.length > max ? invalido({ nome: `Use de ${min} a ${max} caracteres.` }) : valido(nome);
}
