"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirPermissao } from "@/lib/auth";
import { lerPreco } from "@/lib/formato";

export type EstadoServico = {
  erro?: string;
  erros?: { nome?: string; duracao?: string; preco?: string };
  campos?: { nome?: string; duracao?: string; preco?: string };
};

const exigirDono = () => exigirPermissao("editar-servicos", "/painel/servicos");

export async function salvarServico(_anterior: EstadoServico, formData: FormData): Promise<EstadoServico> {
  const { salao } = await exigirDono();

  const id = String(formData.get("id") ?? "") || null;
  const nome = String(formData.get("nome") ?? "").trim().replace(/\s+/g, " ");
  const duracaoTexto = String(formData.get("duracao") ?? "").trim();
  const precoTexto = String(formData.get("preco") ?? "").trim();
  const campos = { nome, duracao: duracaoTexto, preco: precoTexto };

  const erros: EstadoServico["erros"] = {};
  if (nome.length < 2 || nome.length > 60) erros.nome = "Use de 2 a 60 caracteres.";
  const duracao = Number(duracaoTexto);
  if (!Number.isInteger(duracao) || duracao < 5 || duracao > 720) {
    erros.duracao = "Informe a duração em minutos (5 a 720).";
  }
  const preco = lerPreco(precoTexto);
  if (preco === null || preco > 99999.99) erros.preco = "Informe o preço, por exemplo 90 ou 89,90.";
  if (Object.keys(erros).length > 0) return { erros, campos };

  const supabase = await createClient();
  const dados = { nome, duracao_min: duracao, preco: preco! };
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
