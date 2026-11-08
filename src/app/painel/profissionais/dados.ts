import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Faixa } from "@/lib/horarios";

export type ProfissionalResumo = {
  id: string;
  nome: string;
  ativo: boolean;
  memberId: string | null;
  servicos: string[];
  diasTrabalho: number;
};

export async function listarProfissionais(salonId: string): Promise<ProfissionalResumo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("professionals")
    .select("id, nome, ativo, member_id, professional_services(services(nome, ativo)), working_hours(dia_semana)")
    .eq("salon_id", salonId)
    .order("ativo", { ascending: false })
    .order("nome");

  if (error) throw new Error("Falha ao carregar os profissionais.");

  return (data ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    ativo: p.ativo,
    memberId: p.member_id,
    servicos: p.professional_services
      .map((ps) => ps.services)
      .filter((s): s is { nome: string; ativo: boolean } => Boolean(s?.ativo))
      .map((s) => s.nome)
      .sort((a, b) => a.localeCompare(b, "pt-BR")),
    diasTrabalho: new Set(p.working_hours.map((w) => w.dia_semana)).size,
  }));
}

export type Folga = { id: string; inicio: string; fim: string; motivo: string | null };

export type ProfissionalDetalhe = {
  id: string;
  nome: string;
  ativo: boolean;
  memberId: string | null;
  servicoIds: string[];
  faixas: Faixa[];
  folgas: Folga[];
};

export async function buscarProfissional(salonId: string, id: string): Promise<ProfissionalDetalhe | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("professionals")
    .select(
      "id, nome, ativo, member_id, professional_services(service_id), working_hours(dia_semana, inicio, fim), time_off(id, inicio, fim, motivo)",
    )
    .eq("salon_id", salonId)
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  const agora = Date.now();
  return {
    id: data.id,
    nome: data.nome,
    ativo: data.ativo,
    memberId: data.member_id,
    servicoIds: data.professional_services.map((ps) => ps.service_id),
    faixas: data.working_hours.map((w) => ({ dia: w.dia_semana, inicio: w.inicio, fim: w.fim })),
    // Só folgas atuais e futuras, da mais próxima para a mais distante.
    folgas: data.time_off
      .filter((t) => new Date(t.fim).getTime() >= agora)
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
      .map((t) => ({ id: t.id, inicio: t.inicio, fim: t.fim, motivo: t.motivo })),
  };
}

export async function listarServicosAtivos(salonId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("id, nome")
    .eq("salon_id", salonId)
    .eq("ativo", true)
    .order("nome");
  return data ?? [];
}
