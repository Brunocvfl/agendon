// Regras do Profissional (espelham professionals_nome_tamanho no banco).
import { invalido, limparTexto, valido, type Resultado } from "./resultado";

export const LIMITES_PROFISSIONAL = { nome: { min: 2, max: 60 } } as const;

export function lerNomeProfissional(texto: string | undefined): Resultado<string> {
  const { min, max } = LIMITES_PROFISSIONAL.nome;
  const nome = limparTexto(texto);
  return nome.length < min || nome.length > max ? invalido({ nome: `Use de ${min} a ${max} caracteres.` }) : valido(nome);
}

/** Por que o banco não deixa excluir (arquivar_profissional, P0001): o texto que a tela mostra. */
export const ERROS_EXCLUIR_PROFISSIONAL: Record<string, string> = {
  tem_agendamentos_futuros:
    "Esse profissional tem agendamentos marcados para frente. Remarque ou cancele esses agendamentos antes de excluir.",
  agenda_de_login:
    "Essa é a agenda de alguém da equipe com perfil Profissional. Em Configurações → Equipe, remova essa pessoa ou troque a agenda dela antes de excluir.",
};
