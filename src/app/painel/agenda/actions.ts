"use server";

import { acaoDoPainel, texto, type EstadoForm } from "@/lib/acao";
import { exigirPermissao } from "@/lib/auth";
import { pode } from "@/lib/permissoes";
import * as agendamento from "@/lib/agendamento";
import { formatarData, horaNoFuso } from "@/lib/datas";
import { formatarTelefone } from "@/lib/formato";
import { lerAgendamento, lerMudancaDeStatus, lerRemarcacao } from "@/lib/regras/agendamento";
import { invalido, valido } from "@/lib/regras/resultado";
import { createClient } from "@/lib/supabase/server";

export type { EstadoForm };

// Dono(a) e Recepção agendam em qualquer agenda; Profissional, só na própria (o banco confere).
const PERMISSAO = "criar-agendamento" as const;
const VOLTAR = "/painel/agenda";

const OCUPADO = { campo: "hora", msg: "Esse horário já está ocupado para este profissional. Escolha um dos horários livres." };
const FORA = { campo: "encaixe", msg: "Fora do expediente ou numa folga do profissional." };
const SERVICO_NAO_ATENDIDO = "Este profissional não faz esse serviço.";
const DADO_INVALIDO = "Algum dado não foi aceito. Confira e tente de novo.";
const OUTRO = "Não foi possível salvar agora. Tente de novo em instantes.";

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
  executar: (a, { supabase }) => agendamento.criar(a, { supabase }),
  mensagens: {
    ocupado: OCUPADO,
    "fora-do-expediente": FORA,
    "servico-nao-atendido": { campo: "servico", msg: SERVICO_NAO_ATENDIDO },
    "cliente-invalido": { campo: "telefone", msg: "Confira o nome e o WhatsApp do cliente." },
    "cliente-nao-encontrado": { campo: "cliente", msg: "Cliente não encontrado. Busque de novo." },
    "dado-invalido": DADO_INVALIDO,
    "nao-encontrado": { campo: "profissional", msg: "Profissional não encontrado ou inativo." },
    "sem-permissao": { campo: "profissional", msg: "Você só pode agendar na sua própria agenda." },
    outro: OUTRO,
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
  executar: (r, { supabase }) => agendamento.remarcar(r, { supabase }),
  mensagens: {
    ocupado: OCUPADO,
    "fora-do-expediente": FORA,
    "servico-nao-atendido": { campo: "profissional", msg: SERVICO_NAO_ATENDIDO },
    "transicao-invalida": "Só agendamentos agendados ou confirmados podem ser remarcados.",
    "dado-invalido": DADO_INVALIDO,
    "sem-permissao": "Você só pode remarcar dentro da sua própria agenda.",
    "nao-encontrado": "Agendamento ou profissional não encontrado. Recarregue a página.",
    outro: OUTRO,
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
  executar: (v, { supabase }) => agendamento.mudarStatus(v, { supabase }),
  mensagens: {
    ocupado: "O horário já foi ocupado por outro agendamento. Para atender este cliente, crie um agendamento novo.",
    "ainda-nao-comecou": "Concluído e faltou só podem ser marcados a partir do horário de início.",
    "transicao-invalida": "Este status não pode ser aplicado agora. Recarregue a página.",
    "dado-invalido": "Este status não pode ser aplicado agora. Recarregue a página.",
    "sem-permissao": "Você só pode mudar agendamentos da sua própria agenda.",
    "nao-encontrado": "Agendamento não encontrado. Recarregue a página.",
    outro: OUTRO,
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
 * `null`: o banco falhou (a tela avisa, em vez de dizer que não há horário livre).
 */
export async function horariosLivres(profissional: string, servico: string, dia: string, ignorar?: string): Promise<string[] | null> {
  const { salao } = await exigirPermissao("criar-agendamento", VOLTAR);
  const r = await agendamento.horariosLivres({ profissional, servico, dia, ignorar }, { supabase: await createClient() });
  return r.ok ? r.data.map((h) => horaNoFuso(h, salao.fuso)) : null;
}
