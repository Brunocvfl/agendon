import "server-only";
import type { Vinculo } from "@/lib/auth";
import { faixasEmMinutos, periodoNoDia, type Periodo } from "@/lib/agenda";
import { diaDaSemana, somarDias } from "@/lib/datas";
import { pode } from "@/lib/permissoes";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Status = Database["public"]["Enums"]["appointment_status"];

export type ItemAgenda = {
  id: string;
  profissionalId: string;
  periodo: Periodo;
  inicio: string;
  fim: string;
  status: Status;
  preco: number;
  servico: string;
  clienteId: string | null;
  clienteNome: string;
};

export type ColunaAgenda = {
  id: string;
  nome: string;
  faixas: Periodo[];
  folgas: (Periodo & { motivo: string | null })[];
  itens: ItemAgenda[];
};

/** Agenda de um dia: colunas por profissional (Profissional vê só a própria), com expediente, folgas e agendamentos. */
export async function carregarAgenda(vinculo: Vinculo, dia: string): Promise<ColunaAgenda[]> {
  const { salao, perfil, membroId } = vinculo;
  const supabase = await createClient();

  let consulta = supabase
    .from("professionals")
    .select("id, nome, member_id, working_hours(dia_semana, inicio, fim)")
    .eq("salon_id", salao.id)
    .eq("ativo", true)
    .order("nome");
  if (!pode(perfil, "ver-agenda-de-todos")) consulta = consulta.eq("member_id", membroId);

  // Folgas: busca com folga de um dia para cada lado (UTC) e recorta no dia do salão.
  const [profs, folgas, agenda] = await Promise.all([
    consulta,
    supabase
      .from("time_off")
      .select("professional_id, inicio, fim, motivo")
      .eq("salon_id", salao.id)
      .lt("inicio", `${somarDias(dia, 2)}T00:00:00Z`)
      .gt("fim", `${somarDias(dia, -1)}T00:00:00Z`),
    supabase.rpc("agenda", { p_salon: salao.id, p_de: dia, p_ate: dia }),
  ]);
  if (profs.error || folgas.error || agenda.error) throw new Error("Falha ao carregar a agenda.");

  const dow = diaDaSemana(dia);
  return (profs.data ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    faixas: faixasEmMinutos(p.working_hours.filter((w) => w.dia_semana === dow)),
    folgas: (folgas.data ?? [])
      .filter((f) => f.professional_id === p.id)
      .map((f) => ({ ...periodoNoDia(f.inicio, f.fim, dia, salao.fuso), motivo: f.motivo }))
      .filter((f) => f.ate > f.de),
    itens: (agenda.data ?? [])
      .filter((a) => a.professional_id === p.id)
      .map((a) => ({
        id: a.id,
        profissionalId: a.professional_id,
        periodo: periodoNoDia(a.inicio, a.fim, dia, salao.fuso),
        inicio: a.inicio,
        fim: a.fim,
        status: a.status,
        preco: Number(a.preco),
        servico: a.servico,
        clienteId: a.cliente_id ?? null,
        clienteNome: a.cliente_nome,
      })),
  }));
}

export type OpcoesAgendamento = {
  profissionais: { id: string; nome: string; servicos: string[] }[];
  servicos: { id: string; nome: string; duracao: number; preco: number }[];
};

/** Profissionais ativos com os serviços ativos que cada um faz (para o formulário de novo agendamento). */
export async function opcoesAgendamento(salonId: string): Promise<OpcoesAgendamento> {
  const supabase = await createClient();
  const [profs, servs] = await Promise.all([
    supabase
      .from("professionals")
      .select("id, nome, professional_services(service_id)")
      .eq("salon_id", salonId)
      .eq("ativo", true)
      .order("nome"),
    supabase.from("services").select("id, nome, duracao_min, preco").eq("salon_id", salonId).eq("ativo", true).order("nome"),
  ]);
  if (profs.error || servs.error) throw new Error("Falha ao carregar profissionais e serviços.");

  const ativos = new Set((servs.data ?? []).map((s) => s.id));
  return {
    profissionais: (profs.data ?? []).map((p) => ({
      id: p.id,
      nome: p.nome,
      servicos: p.professional_services.map((ps) => ps.service_id).filter((id) => ativos.has(id)),
    })),
    servicos: (servs.data ?? []).map((s) => ({ id: s.id, nome: s.nome, duracao: s.duracao_min, preco: Number(s.preco) })),
  };
}
