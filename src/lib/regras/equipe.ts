// Regras da Equipe: convite (nome, e-mail, perfil e agenda) e edição de quem já está na equipe.
// Espelham o banco (members_nome_tamanho, member_role) e as regras do gatilho members_guarda.
import { ehUuid } from "@/lib/ids";
import type { Perfil } from "@/lib/permissoes";
import { invalido, limparTexto, valido, type ErrosPorCampo, type Resultado } from "./resultado";

export const LIMITES_EQUIPE = { nome: { min: 2, max: 80 }, email: { max: 254 } } as const;

export const PERFIS: readonly Perfil[] = ["dono", "recepcao", "profissional"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Agenda ligada ao login: nenhuma, uma nova (com o nome da pessoa) ou um profissional existente. */
export type Agenda = { tipo: "nenhuma" } | { tipo: "nova" } | { tipo: "existente"; id: string };

export type MembroValido = { nome: string; perfil: Perfil; agenda: Agenda };
export type ConviteValido = MembroValido & { email: string };

/** Valor do campo "agenda" no formulário: "" (nenhuma), "nova" ou o id do profissional. */
export const AGENDA_NOVA = "nova";

/** Nome, perfil e agenda. Profissional precisa de agenda (sem ela, não vê nada no painel). */
export function lerMembro(entrada: { nome?: string; perfil?: string; agenda?: string }): Resultado<MembroValido> {
  const erros: ErrosPorCampo = {};
  const { min, max } = LIMITES_EQUIPE.nome;

  const nome = limparTexto(entrada.nome);
  if (nome.length < min || nome.length > max) erros.nome = `Use de ${min} a ${max} caracteres.`;

  const perfil = (entrada.perfil ?? "") as Perfil;
  if (!PERFIS.includes(perfil)) erros.perfil = "Escolha o perfil.";

  const valor = (entrada.agenda ?? "").trim();
  let agenda: Agenda = { tipo: "nenhuma" };
  if (valor === AGENDA_NOVA) agenda = { tipo: "nova" };
  else if (ehUuid(valor)) agenda = { tipo: "existente", id: valor };
  else if (valor) erros.agenda = "Agenda inválida. Recarregue a página.";
  if (!erros.agenda && perfil === "profissional" && agenda.tipo === "nenhuma") {
    erros.agenda = "Escolha a agenda desse profissional (ou crie uma nova).";
  }

  return Object.keys(erros).length > 0 ? invalido(erros) : valido({ nome, perfil, agenda });
}

export function lerConvite(entrada: {
  nome?: string;
  email?: string;
  perfil?: string;
  agenda?: string;
}): Resultado<ConviteValido> {
  const membro = lerMembro(entrada);
  const email = (entrada.email ?? "").trim().toLowerCase();
  const erroEmail = EMAIL_RE.test(email) && email.length <= LIMITES_EQUIPE.email.max ? null : "Informe um e-mail válido.";

  if (!membro.ok) return invalido(erroEmail ? { ...membro.erros, email: erroEmail } : membro.erros);
  if (erroEmail) return invalido({ email: erroEmail });
  return valido({ ...membro.valor, email });
}

/** Mensagens das regras do gatilho members_guarda (o banco responde com o nome da regra). */
export const ERROS_EQUIPE: Record<string, string> = {
  proprio_acesso: "Você não pode mudar o seu próprio perfil nem desativar o seu acesso.",
  ultimo_dono: "O salão precisa de pelo menos um Dono(a) ativo.",
  convite_pendente: "Essa pessoa ainda não aceitou o convite.",
  membro_nao_apaga: "Quem já entrou no salão não é removido: desative o acesso.",
  membro_imutavel: "Não foi possível salvar. Recarregue a página.",
};
