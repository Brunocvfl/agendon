// Regras do Agendamento feito pelo painel. O banco (criar_agendamento, remarcar_agendamento,
// mudar_status) confere o resto: serviço que o profissional faz, expediente/folga (encaixe),
// conflito de horário (23P01) e quem pode mexer em qual agenda.
import { ehData } from "@/lib/datas";
import type { Database } from "@/lib/supabase/database.types";
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

  lerHorario(erros, profissional, dia, hora);
  if (!ehUuid(servico)) erros.servico = "Escolha o serviço.";

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

export type EntradaAgendamentoPublico = {
  servico?: string;
  /** Vazio = qualquer profissional. */
  profissional?: string;
  dia?: string;
  hora?: string;
  nome?: string;
  telefone?: string;
  optin?: boolean;
};

export type AgendamentoPublicoValido = {
  servico: string;
  profissional: string | null;
  /** Horário local do salão, "AAAA-MM-DDTHH:MM". */
  inicio: string;
  nome: string;
  telefone: string;
  optin: boolean;
};

/** Agendamento feito pelo cliente na página pública. O banco (agendar_publico) confere o resto. */
export function lerAgendamentoPublico(e: EntradaAgendamentoPublico): Resultado<AgendamentoPublicoValido> {
  const erros: ErrosPorCampo = {};
  const servico = e.servico ?? "";
  const profissional = e.profissional ?? "";
  const dia = e.dia ?? "";
  const hora = e.hora ?? "";

  if (!ehUuid(servico)) erros.servico = "Escolha o serviço.";
  if (profissional !== "" && !ehUuid(profissional)) erros.profissional = "Escolha o profissional.";
  if (!ehData(dia)) erros.dia = "Escolha o dia.";
  if (!HORA_RE.test(hora)) erros.hora = "Escolha o horário.";

  const cliente = lerCliente({ nome: e.nome, telefone: e.telefone });
  if (!cliente.ok) {
    if (cliente.erros.nome) erros.nome = cliente.erros.nome;
    if (cliente.erros.telefone) erros.telefone = cliente.erros.telefone;
  }

  if (Object.keys(erros).length > 0 || !cliente.ok) return invalido(erros);
  return valido({
    servico,
    profissional: profissional || null,
    inicio: `${dia}T${hora}`,
    nome: cliente.valor.nome,
    telefone: cliente.valor.telefone,
    optin: Boolean(e.optin),
  });
}

function lerHorario(erros: ErrosPorCampo, profissional: string, dia: string, hora: string) {
  if (!ehUuid(profissional)) erros.profissional = "Escolha o profissional.";
  if (!ehData(dia)) erros.dia = "Escolha o dia.";
  if (!HORA_RE.test(hora)) erros.hora = "Escolha o horário.";
}

// --- Remarcação ---------------------------------------------------------------

export type EntradaRemarcacao = { id?: string; profissional?: string; dia?: string; hora?: string; encaixe?: boolean };
export type RemarcacaoValida = { id: string; profissional: string; dia: string; inicio: string; encaixe: boolean };

/** Novo dia, hora e (opcionalmente) profissional. Serviço, cliente e preço não mudam. */
export function lerRemarcacao(e: EntradaRemarcacao): Resultado<RemarcacaoValida> {
  const erros: ErrosPorCampo = {};
  const id = e.id ?? "";
  const profissional = e.profissional ?? "";
  const dia = e.dia ?? "";
  const hora = e.hora ?? "";
  if (!ehUuid(id)) erros._geral = "Agendamento não encontrado. Recarregue a página.";
  lerHorario(erros, profissional, dia, hora);
  if (Object.keys(erros).length > 0) return invalido(erros);
  return valido({ id, profissional, dia, inicio: `${dia}T${hora}`, encaixe: Boolean(e.encaixe) });
}

// --- Status -------------------------------------------------------------------

export type Status = Database["public"]["Enums"]["appointment_status"];

const STATUS: readonly Status[] = ["agendado", "confirmado", "concluido", "faltou", "cancelado"];
const ehStatus = (s: string): s is Status => (STATUS as readonly string[]).includes(s);

/**
 * Para quais status um agendamento pode ir (espelho de mudar_status no banco):
 * agendado → confirmado; agendado/confirmado → cancelado, e concluído/faltou só depois do início;
 * cancelado/faltou → agendado (desfazer). Concluído é final.
 */
export function proximosStatus(status: Status, comecou: boolean): Status[] {
  switch (status) {
    case "agendado":
    case "confirmado":
      return [
        ...(status === "agendado" ? (["confirmado"] as const) : []),
        ...(comecou ? (["concluido", "faltou"] as const) : []),
        "cancelado",
      ];
    case "cancelado":
    case "faltou":
      return ["agendado"];
    case "concluido":
      return [];
  }
}

/** Só agendamentos ainda de pé (agendado ou confirmado) são remarcados. */
export const podeRemarcar = (status: Status) => status === "agendado" || status === "confirmado";

export function lerMudancaDeStatus(e: { id?: string; status?: string }): { id: string; status: Status } | null {
  const id = e.id ?? "";
  const status = e.status ?? "";
  return ehUuid(id) && ehStatus(status) ? { id, status } : null;
}
