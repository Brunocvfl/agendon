"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirPermissao } from "@/lib/auth";
import { DIAS, telaParaFaixas, type DiaTela } from "@/lib/horarios";
import { lerNomeProfissional } from "@/lib/regras/profissional";
import { lerFolga } from "@/lib/regras/folga";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EstadoForm = {
  erro?: string;
  ok?: string;
  erros?: Record<string, string>;
};

const exigir = (permissao: "editar-profissionais" | "editar-horarios") =>
  exigirPermissao(permissao, "/painel/profissionais");

function lerId(formData: FormData, campo = "id") {
  const id = String(formData.get(campo) ?? "");
  return UUID_RE.test(id) ? id : null;
}

// --- Cadastro (só Dono(a)) -------------------------------------------------

export async function criarProfissional(_a: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { salao, membroId } = await exigir("editar-profissionais");
  const lido = lerNomeProfissional(String(formData.get("nome") ?? ""));
  if (!lido.ok) return { erros: lido.erros };
  const nome = lido.valor;
  const souEu = formData.get("sou_eu") === "on";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("professionals")
    .insert({ salon_id: salao.id, nome, member_id: souEu ? membroId : null })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505" && error.message.includes("member")) {
      return { erro: "Você já está cadastrado(a) como profissional." };
    }
    if (error.code === "23505") return { erros: { nome: "Já existe um profissional com esse nome." } };
    return { erro: "Não foi possível salvar agora. Tente de novo em instantes." };
  }

  redirect(`/painel/profissionais/${data.id}`);
}

export async function salvarDados(_a: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { salao } = await exigir("editar-profissionais");
  const id = lerId(formData);
  const ativo = formData.get("ativo") === "on";
  if (!id) return { erro: "Profissional inválido." };
  const lido = lerNomeProfissional(String(formData.get("nome") ?? ""));
  if (!lido.ok) return { erros: lido.erros };
  const nome = lido.valor;

  const supabase = await createClient();
  const { error } = await supabase.from("professionals").update({ nome, ativo }).eq("id", id).eq("salon_id", salao.id);
  if (error) {
    if (error.code === "23505") return { erros: { nome: "Já existe um profissional com esse nome." } };
    return { erro: "Não foi possível salvar agora." };
  }
  refresh();
  return { ok: "Dados salvos." };
}

export async function salvarServicos(_a: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await exigir("editar-profissionais");
  const id = lerId(formData);
  if (!id) return { erro: "Profissional inválido." };
  const servicos = formData.getAll("servico").map(String).filter((s) => UUID_RE.test(s));

  const supabase = await createClient();
  const { error } = await supabase.rpc("salvar_servicos_profissional", {
    p_professional: id,
    p_servicos: servicos,
  });
  if (error) return { erro: "Não foi possível salvar os serviços." };
  refresh();
  return { ok: "Serviços salvos." };
}

// --- Horários e folgas (Dono(a) e Recepção) --------------------------------

export async function salvarHorarios(_a: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await exigir("editar-horarios");
  const id = lerId(formData);
  if (!id) return { erro: "Profissional inválido." };

  const dias: DiaTela[] = DIAS.map(({ n }) => ({
    dia: n,
    trabalha: formData.get(`d${n}_trabalha`) === "on",
    inicio: String(formData.get(`d${n}_inicio`) ?? ""),
    fim: String(formData.get(`d${n}_fim`) ?? ""),
    intervaloInicio: String(formData.get(`d${n}_ii`) ?? ""),
    intervaloFim: String(formData.get(`d${n}_if`) ?? ""),
  }));

  const { faixas, erros } = telaParaFaixas(dias);
  if (Object.keys(erros).length > 0) {
    return {
      erro: "Confira os dias marcados.",
      erros: Object.fromEntries(Object.entries(erros).map(([dia, msg]) => [`d${dia}`, msg])),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("salvar_horarios", { p_professional: id, p_horarios: faixas });
  if (error) {
    if (error.code === "23P01") return { erro: "Há horários sobrepostos no mesmo dia." };
    return { erro: "Não foi possível salvar os horários." };
  }
  refresh();
  return { ok: "Horários salvos." };
}

export async function adicionarFolga(_a: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await exigir("editar-horarios");
  const id = lerId(formData);
  if (!id) return { erro: "Profissional inválido." };

  const lido = lerFolga({
    inicio: String(formData.get("inicio") ?? ""),
    fim: String(formData.get("fim") ?? ""),
    motivo: String(formData.get("motivo") ?? ""),
  });
  if (!lido.ok) return { erros: lido.erros };
  const { inicio, fim, motivo } = lido.valor;

  const supabase = await createClient();
  // Os horários vão como "horário do salão"; o banco converte para UTC com o fuso do salão.
  const { error } = await supabase.rpc("adicionar_folga", {
    p_professional: id,
    p_inicio: inicio,
    p_fim: fim,
    p_motivo: motivo,
  });
  if (error) return { erro: "Não foi possível salvar a folga." };
  refresh();
  return { ok: "Folga adicionada." };
}

export async function removerFolga(formData: FormData) {
  const { salao } = await exigir("editar-horarios");
  const id = lerId(formData);
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("time_off").delete().eq("id", id).eq("salon_id", salao.id);
  refresh();
}
