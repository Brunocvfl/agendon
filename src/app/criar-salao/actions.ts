"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth";
import { normalizarSlug } from "@/lib/slug";

export type EstadoSalao = {
  erro?: string;
  erros?: { nome?: string; slug?: string };
  campos?: { nome?: string; slug?: string };
};

export async function criarSalao(_anterior: EstadoSalao, formData: FormData): Promise<EstadoSalao> {
  await exigirUsuario();

  const nome = String(formData.get("nome") ?? "").trim();
  const slug = normalizarSlug(String(formData.get("slug") ?? ""));
  const campos = { nome, slug };

  if (nome.length < 2 || nome.length > 80) {
    return { erros: { nome: "Informe o nome do salão (2 a 80 caracteres)." }, campos };
  }
  if (slug.length < 3 || slug.length > 40) {
    return { erros: { slug: "O endereço precisa ter de 3 a 40 caracteres." }, campos };
  }

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
