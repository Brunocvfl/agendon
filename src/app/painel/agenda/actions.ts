"use server";

import { acaoDoPainel, texto, type EstadoForm } from "@/lib/acao";
import { exigirPermissao } from "@/lib/auth";
import { ehData } from "@/lib/datas";
import { formatarTelefone } from "@/lib/formato";
import { ehUuid } from "@/lib/ids";
import { lerAgendamento } from "@/lib/regras/agendamento";
import { createClient } from "@/lib/supabase/server";

export type { EstadoForm };

// Nesta fase, agendar pelo painel exige escolher o cliente (ver telefone e histórico):
// Dono(a) e Recepção. O banco (criar_agendamento) confere o mesmo.
const PERMISSAO = "ver-clientes" as const;
const VOLTAR = "/painel/agenda";

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
    conflito: { campo: "hora", msg: "Esse horário já está ocupado para este profissional. Escolha um dos horários livres." },
    invalido: (e) => {
      if (e.message?.includes("fora_do_expediente")) {
        return { campo: "encaixe", msg: "Fora do expediente ou numa folga do profissional." };
      }
      if (e.message?.includes("servico_nao_atendido")) {
        return { campo: "servico", msg: "Este profissional não faz esse serviço." };
      }
      if (e.message?.includes("clients_")) return { campo: "telefone", msg: "Confira o nome e o WhatsApp do cliente." };
      return "Algum dado não foi aceito. Confira e tente de novo.";
    },
    "nao-encontrado": { campo: "profissional", msg: "Profissional não encontrado ou inativo." },
  },
  depois: { ir: (_id, a) => `/painel/agenda?dia=${a.dia}` },
});

export type ClienteEncontrado = { id: string; nome: string; telefone: string };

/** Busca de cliente no formulário de agendamento (nome ou WhatsApp). */
export async function buscarClientes(busca: string): Promise<ClienteEncontrado[]> {
  const { salao } = await exigirPermissao(PERMISSAO, VOLTAR);
  const termo = String(busca ?? "").trim().slice(0, 80);
  if (termo.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("listar_clientes", { p_salon: salao.id, p_busca: termo, p_limite: 8 });
  return (data ?? []).map((c) => ({ id: c.id, nome: c.nome, telefone: formatarTelefone(c.telefone) }));
}

/** Horários livres ("HH:MM", horário do salão) de um profissional para um serviço num dia. */
export async function horariosLivres(profissional: string, servico: string, dia: string): Promise<string[]> {
  const { salao } = await exigirPermissao(PERMISSAO, VOLTAR);
  if (!ehUuid(profissional) || !ehUuid(servico) || !ehData(dia)) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("horarios_livres", { p_professional: profissional, p_service: servico, p_dia: dia });
  const hora = new Intl.DateTimeFormat("en-GB", { timeZone: salao.fuso, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return (data ?? []).map((h) => hora.format(new Date(h)));
}
