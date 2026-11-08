// Regras do Agendamento feito pelo painel. O banco (criar_agendamento) confere o resto:
// serviço que o profissional faz, expediente/folga (encaixe) e conflito de horário (23P01).
import { ehData } from "@/lib/datas";
import { ehUuid } from "@/lib/ids";
import { lerCliente } from "./cliente";
import { invalido, valido, type ErrosPorCampo, type Resultado } from "./resultado";

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export type EntradaAgendamento = {
  profissional?: string;
  servico?: string;
  dia?: string;
  hora?: string;
  /** "existente" (clienteId) ou "novo" (nome + telefone) */
  modoCliente?: string;
  clienteId?: string;
  nome?: string;
  telefone?: string;
  encaixe?: boolean;
};

export type AgendamentoValido = {
  profissional: string;
  servico: string;
  dia: string;
  /** Horário local do salão, "AAAA-MM-DDTHH:MM" (o banco converte com o fuso do salão). */
  inicio: string;
  cliente: { id: string } | { nome: string; telefone: string };
  encaixe: boolean;
};

export function lerAgendamento(e: EntradaAgendamento): Resultado<AgendamentoValido> {
  const erros: ErrosPorCampo = {};
  const profissional = e.profissional ?? "";
  const servico = e.servico ?? "";
  const dia = e.dia ?? "";
  const hora = e.hora ?? "";

  if (!ehUuid(profissional)) erros.profissional = "Escolha o profissional.";
  if (!ehUuid(servico)) erros.servico = "Escolha o serviço.";
  if (!ehData(dia)) erros.dia = "Escolha o dia.";
  if (!HORA_RE.test(hora)) erros.hora = "Escolha o horário.";

  let cliente: AgendamentoValido["cliente"] | null = null;
  if (e.modoCliente === "novo") {
    const lido = lerCliente({ nome: e.nome, telefone: e.telefone });
    if (lido.ok) cliente = { nome: lido.valor.nome, telefone: lido.valor.telefone };
    else Object.assign(erros, lido.erros.nome ? { nome: lido.erros.nome } : {}, lido.erros.telefone ? { telefone: lido.erros.telefone } : {});
  } else if (ehUuid(e.clienteId ?? "")) {
    cliente = { id: e.clienteId! };
  } else {
    erros.cliente = "Escolha o cliente ou cadastre um novo.";
  }

  if (Object.keys(erros).length > 0 || !cliente) return invalido(erros);
  return valido({ profissional, servico, dia, inicio: `${dia}T${hora}`, cliente, encaixe: Boolean(e.encaixe) });
}
