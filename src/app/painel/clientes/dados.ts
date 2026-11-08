import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export const POR_PAGINA = 20;

export type ClienteDaLista = {
  id: string;
  nome: string;
  telefone: string;
  criadoEm: string;
  ultimoAtendimento: string | null;
  visitas: number;
  faltas: number;
};

export async function listarClientes(salonId: string, busca: string, pagina: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("listar_clientes", {
    p_salon: salonId,
    p_busca: busca,
    p_limite: POR_PAGINA,
    p_offset: (pagina - 1) * POR_PAGINA,
  });
  if (error) throw new Error("Falha ao carregar os clientes.");

  const clientes: ClienteDaLista[] = (data ?? []).map((c) => ({
    id: c.id,
    nome: c.nome,
    telefone: c.telefone,
    criadoEm: c.criado_em,
    ultimoAtendimento: c.ultimo_atendimento ?? null,
    visitas: c.visitas,
    faltas: c.faltas,
  }));
  return { clientes, total: Number(data?.[0]?.total ?? 0) };
}

export type Atendimento = {
  id: string;
  inicio: string;
  status: Database["public"]["Enums"]["appointment_status"];
  servico: string;
  profissional: string;
};

export async function buscarCliente(salonId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select(
      "id, nome, telefone, observacoes, created_at, consentimento_whatsapp_em, optout_em, appointments(id, inicio, status, services(nome), professionals(nome))",
    )
    .eq("salon_id", salonId)
    .eq("id", id)
    .is("anonimizado_em", null)
    .order("inicio", { referencedTable: "appointments", ascending: false })
    .limit(50, { referencedTable: "appointments" })
    .maybeSingle();
  if (!data || !data.telefone) return null;

  const historico: Atendimento[] = data.appointments.map((a) => ({
    id: a.id,
    inicio: a.inicio,
    status: a.status,
    servico: a.services?.nome ?? "Serviço",
    profissional: a.professionals?.nome ?? "Profissional",
  }));

  return {
    id: data.id,
    nome: data.nome,
    telefone: data.telefone,
    observacoes: data.observacoes ?? "",
    criadoEm: data.created_at,
    optIn: Boolean(data.consentimento_whatsapp_em) && !data.optout_em,
    historico,
    visitas: historico.filter((a) => a.status === "concluido").length,
    faltas: historico.filter((a) => a.status === "faltou").length,
  };
}
