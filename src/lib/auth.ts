// Camada de acesso (DAL): toda checagem de login e de salão passa por aqui.
// A RLS no banco continua sendo a garantia final; isto só decide o que mostrar e para onde mandar.
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pode, type Perfil, type Permissao } from "@/lib/permissoes";

export type { Perfil, Permissao };

export type Usuario = { id: string; email: string | null };

export type Vinculo = {
  membroId: string;
  perfil: Perfil;
  salao: { id: string; nome: string; slug: string; fuso: string };
};

// Usuário logado, validado pelo JWT (getClaims). Nunca usar getSession() no servidor.
export const getUsuario = cache(async (): Promise<Usuario | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});

export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await getUsuario();
  if (!usuario) redirect("/entrar");
  return usuario;
}

// Salão do usuário (MVP: um por login). A RLS só devolve vínculos ativos do próprio usuário.
export const getVinculo = cache(async (): Promise<Vinculo | null> => {
  const usuario = await getUsuario();
  if (!usuario) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, perfil, salons!inner(id, nome, slug, fuso)")
    .eq("user_id", usuario.id)
    .eq("status", "ativo")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error("Falha ao carregar o salão do usuário.");
  if (!data) return null;
  return { membroId: data.id, perfil: data.perfil, salao: data.salons };
});

export type Acesso = { salaoNome: string; perfil: Perfil; status: "ativo" | "convidado" | "inativo"; nome: string | null };

// Vínculo em qualquer situação (convite pendente, desativado): para mandar o convidado ao aceite e
// explicar a quem foi desativado por que não entra. Não dá acesso a nada.
export const getAcesso = cache(async (): Promise<Acesso | null> => {
  if (!(await getUsuario())) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("meu_acesso").maybeSingle();
  if (error) throw new Error("Falha ao carregar o acesso do usuário.");
  if (!data) return null;
  return { salaoNome: data.salao_nome, perfil: data.perfil, status: data.status as Acesso["status"], nome: data.nome };
});

export async function exigirVinculo(): Promise<Vinculo> {
  await exigirUsuario();
  const vinculo = await getVinculo();
  if (!vinculo) redirect("/criar-salao");
  return vinculo;
}

// Vínculo com a permissão pedida; sem ela, manda para `senao` (uma tela que o perfil pode ver).
export async function exigirPermissao(permissao: Permissao, senao = "/painel"): Promise<Vinculo> {
  const vinculo = await exigirVinculo();
  if (!pode(vinculo.perfil, permissao)) redirect(senao);
  return vinculo;
}
