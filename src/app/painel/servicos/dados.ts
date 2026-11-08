import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Servico = {
  id: string;
  nome: string;
  duracao_min: number;
  preco: number;
  ativo: boolean;
  profissionais: { id: string; nome: string }[];
};

export async function listarServicos(salonId: string): Promise<Servico[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, nome, duracao_min, preco, ativo, professional_services(professionals(id, nome, ativo))")
    .eq("salon_id", salonId)
    .order("ativo", { ascending: false })
    .order("nome");

  if (error) throw new Error("Falha ao carregar os serviços.");

  return (data ?? []).map((s) => ({
    id: s.id,
    nome: s.nome,
    duracao_min: s.duracao_min,
    preco: Number(s.preco),
    ativo: s.ativo,
    profissionais: s.professional_services
      .map((ps) => ps.professionals)
      .filter((p): p is { id: string; nome: string; ativo: boolean } => Boolean(p?.ativo))
      .map(({ id, nome }) => ({ id, nome })),
  }));
}

export async function buscarServico(salonId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("id, nome, duracao_min, preco")
    .eq("salon_id", salonId)
    .eq("id", id)
    .maybeSingle();
  return data ? { ...data, preco: Number(data.preco) } : null;
}
