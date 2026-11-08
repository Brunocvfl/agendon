// Regras do Serviço (espelham as restrições do banco: services_nome_tamanho, services_duracao_faixa, services_preco_teto).
import { lerPreco } from "@/lib/formato";
import { invalido, limparTexto, valido, type ErrosPorCampo, type Resultado } from "./resultado";

export const LIMITES_SERVICO = {
  nome: { min: 2, max: 60 },
  duracao: { min: 5, max: 720, passo: 5 },
  precoMax: 99999.99,
} as const;

export type ServicoValido = { nome: string; duracao_min: number; preco: number };

export function lerServico(entrada: { nome?: string; duracao?: string; preco?: string }): Resultado<ServicoValido> {
  const { nome: n, duracao: d, precoMax } = LIMITES_SERVICO;
  const erros: ErrosPorCampo = {};

  const nome = limparTexto(entrada.nome);
  if (nome.length < n.min || nome.length > n.max) erros.nome = `Use de ${n.min} a ${n.max} caracteres.`;

  const duracao = Number((entrada.duracao ?? "").trim());
  if (!Number.isInteger(duracao) || duracao < d.min || duracao > d.max) {
    erros.duracao = `Informe a duração em minutos (${d.min} a ${d.max}).`;
  }

  const preco = lerPreco(entrada.preco ?? "");
  if (preco === null || preco > precoMax) erros.preco = "Informe o preço, por exemplo 90 ou 89,90.";

  return Object.keys(erros).length > 0 ? invalido(erros) : valido({ nome, duracao_min: duracao, preco: preco! });
}
