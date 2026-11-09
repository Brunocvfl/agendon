import "server-only";
import type { Perfil } from "@/lib/permissoes";
import { createClient } from "@/lib/supabase/server";

export type StatusMembro = "ativo" | "convidado" | "inativo";

export type Membro = {
  id: string;
  userId: string;
  nome: string | null;
  email: string;
  perfil: Perfil;
  status: StatusMembro;
  convidadoEm: string | null;
  ultimoAcesso: string | null;
  agenda: { id: string; nome: string } | null;
};

/** Equipe do salão com e-mail e agenda ligada (função equipe(): só Dono(a)). */
export async function carregarEquipe(salaoId: string): Promise<Membro[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("equipe", { p_salon: salaoId });
  if (error) throw new Error("Falha ao carregar a equipe.");
  return (data ?? []).map((m) => ({
    id: m.id,
    userId: m.user_id,
    nome: m.nome,
    email: m.email,
    perfil: m.perfil,
    status: m.status as StatusMembro,
    convidadoEm: m.convidado_em,
    ultimoAcesso: m.ultimo_acesso,
    agenda: m.profissional_id ? { id: m.profissional_id, nome: m.profissional_nome ?? "" } : null,
  }));
}

/** Agendas (profissionais ativos) sem login ligado, mais a do membro em edição. */
export async function agendasLivres(salaoId: string, atual?: string | null): Promise<{ id: string; nome: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("professionals")
    .select("id, nome, member_id")
    .eq("salon_id", salaoId)
    .eq("ativo", true)
    .order("nome");
  if (error) throw new Error("Falha ao carregar as agendas.");
  return (data ?? []).filter((p) => p.member_id === null || p.id === atual).map((p) => ({ id: p.id, nome: p.nome }));
}
