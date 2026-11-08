"use server";

import { acaoDoPainel, texto, type EstadoForm } from "@/lib/acao";
import { exigirPermissao } from "@/lib/auth";
import { pode } from "@/lib/permissoes";
import { ehData } from "@/lib/datas";
import { formatarData, formatarTelefone } from "@/lib/formato";
import { ehUuid } from "@/lib/ids";
import { lerAgendamento, lerMudancaDeStatus, lerRemarcacao } from "@/lib/regras/agendamento";
import { invalido, valido } from "@/lib/regras/resultado";
import { createClient } from "@/lib/supabase/server";

export type { EstadoForm };

// Dono(a) e Recepção agendam em qualquer agenda; Profissional, só na própria (o banco confere).
const PERMISSAO = "criar-agendamento" as const;
const VOLTAR = "/painel/agenda";

const ERROS_DE_HORARIO = {
  conflito: { campo: "hora", msg: "Esse horário já está ocupado para este profissional. Escolha um dos horários livres." },
  fora: { campo: "encaixe", msg: "Fora do expediente ou numa folga do profissional." },
  servico: { campo: "profissional", msg: "Este profissional não faz esse serviço." },
} as const;

export const criarAgendamento = acaoDoPainel({
  permissao: PERMISSAO,
  senao: VOLTAR,
  devolver: ["nome", "telefone"],
  ler: (fd) =>
    lerAgendamento({
      profissional: texto(fd, "profissional"),
      servico: texto(fd, "servico"),
      dia: texto(fd, "dia"),
      hora: texto(fd, "hora"),
      modoCliente: texto(fd, "modoCliente"),
      clienteId: texto(fd, "clienteId"),
      nome: texto(fd, "nome"),
      telefone: texto(fd, "telefone"),
      encaixe: texto(fd, "encaixe") === "on",
    }),
  executar: (a, { supabase }) =>
    supabase.rpc("criar_agendamento", {
      p_professional: a.profissional,
      p_service: a.servico,
      p_inicio: a.inicio,
      p_encaixe: a.encaixe,
      ...("id" in a.cliente
        ? { p_client: a.cliente.id }
        : { p_cliente_nome: a.cliente.nome, p_cliente_telefone: a.cliente.telefone }),
    }),
  mensagens: {
    conflito: ERROS_DE_HORARIO.conflito,
    invalido: (e) => {
      if (e.message?.includes("fora_do_expediente")) return ERROS_DE_HORARIO.fora;
      if (e.message?.includes("servico_nao_atendido")) return { campo: "servico", msg: ERROS_DE_HORARIO.servico.msg };
      if (e.message?.includes("clients_")) return { campo: "telefone", msg: "Confira o nome e o WhatsApp do cliente." };
      if (e.message?.includes("cliente_nao_encontrado")) return { campo: "cliente", msg: "Cliente não encontrado. Busque de novo." };
      return "Algum dado não foi aceito. Confira e tente de novo.";
    },
    "nao-encontrado": { campo: "profissional", msg: "Profissional não encontrado ou inativo." },
    "sem-permissao": { campo: "profissional", msg: "Você só pode agendar na sua própria agenda." },
  },
  depois: { ir: (_id, a) => `/painel/agenda?dia=${a.dia}` },
});

/** Remarca: novo dia, hora e, se quiser, outro profissional (Profissional: só na própria agenda). */
export const remarcarAgendamento = acaoDoPainel({
  permissao: "criar-agendamento",
  senao: VOLTAR,
  ler: (fd) =>
    lerRemarcacao({
      id: texto(fd, "id"),
      profissional: texto(fd, "profissional"),
      dia: texto(fd, "dia"),
      hora: texto(fd, "hora"),
      encaixe: texto(fd, "encaixe") === "on",
    }),
  executar: (r, { supabase }) =>
    supabase.rpc("remarcar_agendamento", {
      p_appointment: r.id,
      p_professional: r.profissional,
      p_inicio: r.inicio,
      p_encaixe: r.encaixe,
    }),
  mensagens: {
    conflito: ERROS_DE_HORARIO.conflito,
    invalido: (e) => {
      if (e.message?.includes("fora_do_expediente")) return ERROS_DE_HORARIO.fora;
      if (e.message?.includes("servico_nao_atendido")) return ERROS_DE_HORARIO.servico;
      if (e.message?.includes("transicao_invalida")) return "Só agendamentos agendados ou confirmados podem ser remarcados.";
      return "Algum dado não foi aceito. Confira e tente de novo.";
    },
    "sem-permissao": "Você só pode remarcar dentro da sua própria agenda.",
    "nao-encontrado": "Agendamento ou profissional não encontrado. Recarregue a página.",
  },
  depois: { ir: (_d, r) => `/painel/agenda?dia=${r.dia}` },
});

/** Confirmar, concluir, faltou, cancelar ou desfazer (volta para agendado). */
export const mudarStatus = acaoDoPainel({
  permissao: "mudar-status",
  senao: VOLTAR,
  ler: (fd) => {
    const v = lerMudancaDeStatus({ id: texto(fd, "id"), status: texto(fd, "status") });
    return v ? valido(v) : invalido({ _geral: "Recarregue a página e tente de novo." });
  },
  executar: (v, { supabase }) => supabase.rpc("mudar_status", { p_appointment: v.id, p_status: v.status }),
  mensagens: {
    conflito: "O horário já foi ocupado por outro agendamento. Para atender este cliente, crie um agendamento novo.",
    invalido: (e) =>
      e.message?.includes("ainda_nao_comecou")
        ? "Concluído e faltou só podem ser marcados a partir do horário de início."
        : "Este status não pode ser aplicado agora. Recarregue a página.",
    "sem-permissao": "Você só pode mudar agendamentos da sua própria agenda.",
    "nao-encontrado": "Agendamento não encontrado. Recarregue a página.",
  },
  depois: { ok: "Status atualizado." },
});

/** `detalhe`: WhatsApp para quem vê clientes; para o Profissional, só a última visita (sem telefone). */
export type ClienteEncontrado = { id: string; nome: string; detalhe: string };

/** Busca de cliente no formulário de agendamento (nome ou WhatsApp). */
export async function buscarClientes(busca: string): Promise<ClienteEncontrado[]> {
  const { salao, perfil } = await exigirPermissao(PERMISSAO, VOLTAR);
  const termo = String(busca ?? "").trim().slice(0, 80);
  if (termo.length < 2) return [];
  const supabase = await createClient();
  if (pode(perfil, "ver-clientes")) {
    const { data } = await supabase.rpc("listar_clientes", { p_salon: salao.id, p_busca: termo, p_limite: 8 });
    return (data ?? []).map((c) => ({ id: c.id, nome: c.nome, detalhe: formatarTelefone(c.telefone) }));
  }
  // Profissional: busca só por nome, sem telefone.
  const { data } = await supabase.rpc("buscar_clientes_por_nome", { p_salon: salao.id, p_busca: termo, p_limite: 8 });
  return (data ?? []).map((c) => ({
    id: c.id,
    nome: c.nome,
    detalhe: c.ultimo_atendimento ? `última visita ${formatarData(c.ultimo_atendimento, salao.fuso)}` : "sem visitas",
  }));
}

/**
 * Horários livres ("HH:MM", horário do salão) de um profissional para um serviço num dia.
 * `ignorar`: o agendamento que está sendo remarcado (não ocupa o próprio horário).
 * Profissional só enxerga a própria agenda (RLS), e é só nela que remarca.
 */
export async function horariosLivres(profissional: string, servico: string, dia: string, ignorar?: string): Promise<string[]> {
  const { salao } = await exigirPermissao("criar-agendamento", VOLTAR);
  if (!ehUuid(profissional) || !ehUuid(servico) || !ehData(dia)) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("horarios_livres", {
    p_professional: profissional,
    p_service: servico,
    p_dia: dia,
    ...(ignorar && ehUuid(ignorar) ? { p_ignorar: ignorar } : {}),
  });
  const hora = new Intl.DateTimeFormat("en-GB", { timeZone: salao.fuso, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return (data ?? []).map((h) => hora.format(new Date(h)));
}
