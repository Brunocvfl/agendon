// Camada de acesso (DAL): toda checagem de login e de salão passa por aqui.
// A RLS no banco continua sendo a garantia final; isto só decide o que mostrar e para onde mandar.
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Perfil = Database["public"]["Enums"]["member_role"];

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

// Atalhos da matriz de permissões (a RLS garante o mesmo no banco).
export const podeEditarCadastro = (perfil: Perfil) => perfil === "dono";
export const podeEditarHorarios = (perfil: Perfil) => perfil === "dono" || perfil === "recepcao";

export async function exigirVinculo(): Promise<Vinculo> {
  await exigirUsuario();
  const vinculo = await getVinculo();
  if (!vinculo) redirect("/criar-salao");
  return vinculo;
}
