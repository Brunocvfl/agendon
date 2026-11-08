"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth";
import { lerSalao } from "@/lib/regras/salao";

export type EstadoSalao = {
  erro?: string;
  erros?: { nome?: string; slug?: string };
  campos?: { nome?: string; slug?: string };
};

export async function criarSalao(_anterior: EstadoSalao, formData: FormData): Promise<EstadoSalao> {
  await exigirUsuario();

  const campos = { nome: String(formData.get("nome") ?? ""), slug: String(formData.get("slug") ?? "") };
  const lido = lerSalao(campos);
  if (!lido.ok) return { erros: lido.erros, campos };
  const { nome, slug } = lido.valor;

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_salon", { p_nome: nome, p_slug: slug });

  if (error) {
    if (error.message === "ja_tem_salao") redirect("/painel");
    if (error.code === "23505") {
      return { erros: { slug: "Este endereço já está em uso. Tente outro." }, campos };
    }
    if (error.message === "slug_reservado") {
      return { erros: { slug: "Este endereço é reservado pelo AgendOn. Tente outro." }, campos };
    }
    if (error.message === "slug_invalido") {
      return { erros: { slug: "Use só letras minúsculas, números e hífens." }, campos };
    }
    if (error.message === "nome_invalido") {
      return { erros: { nome: "Informe o nome do salão (2 a 80 caracteres)." }, campos };
    }
    if (error.message === "nao_autenticado") redirect("/entrar");
    return { erro: "Não foi possível criar o salão agora. Tente de novo em instantes.", campos };
  }

  redirect("/painel");
}
