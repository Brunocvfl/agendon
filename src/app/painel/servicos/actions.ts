"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirPermissao } from "@/lib/auth";
import { lerServico } from "@/lib/regras/servico";

export type EstadoServico = {
  erro?: string;
  erros?: { nome?: string; duracao?: string; preco?: string };
  campos?: { nome?: string; duracao?: string; preco?: string };
};

const exigirDono = () => exigirPermissao("editar-servicos", "/painel/servicos");

export async function salvarServico(_anterior: EstadoServico, formData: FormData): Promise<EstadoServico> {
  const { salao } = await exigirDono();

  const id = String(formData.get("id") ?? "") || null;
  const campos = {
    nome: String(formData.get("nome") ?? ""),
    duracao: String(formData.get("duracao") ?? ""),
    preco: String(formData.get("preco") ?? ""),
  };
  const lido = lerServico(campos);
  if (!lido.ok) return { erros: lido.erros, campos };

  const supabase = await createClient();
  const dados = lido.valor;
  const { error } = id
    ? await supabase.from("services").update(dados).eq("id", id).eq("salon_id", salao.id)
    : await supabase.from("services").insert({ ...dados, salon_id: salao.id });

  if (error) {
    if (error.code === "23505") return { erros: { nome: "Já existe um serviço com esse nome." }, campos };
    return { erro: "Não foi possível salvar agora. Tente de novo em instantes.", campos };
  }

  redirect("/painel/servicos");
}

export async function alternarAtivo(formData: FormData) {
  const { salao } = await exigirDono();
  const id = String(formData.get("id") ?? "");
  const ativo = formData.get("ativo") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("services").update({ ativo }).eq("id", id).eq("salon_id", salao.id);
  refresh();
}
