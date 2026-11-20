"use server";

import { acaoDoPainel, comandoDoPainel, ERRO_GERAL, texto, type EstadoForm } from "@/lib/acao";
import { ERROS_EXCLUIR_PROFISSIONAL } from "@/lib/regras/profissional";
import { ERRO_LIMITE_DE_AGENDAS, ehLimiteDeAgendas } from "@/lib/regras/plano";
import { ehUuid } from "@/lib/ids";
import { DIAS, telaParaFaixas, type DiaTela } from "@/lib/horarios";
import { lerFolga } from "@/lib/regras/folga";
import { lerNomeProfissional } from "@/lib/regras/profissional";
import { invalido, valido } from "@/lib/regras/resultado";
import { ehCaminhoDeFoto } from "@/lib/foto";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type { EstadoForm };

const VOLTAR = "/painel/profissionais";
const SEM_ID = invalido({ [ERRO_GERAL]: "Profissional inválido. Recarregue a página." });
const NOME_REPETIDO = { campo: "nome", msg: "Já existe um profissional com esse nome." };
// Cadastrar ou reativar além do limite do plano (gatilho professionals_limite_de_agendas).
const LIMITE_OU_GERAL = (e: { message?: string }) =>
  ehLimiteDeAgendas(e) ? ERRO_LIMITE_DE_AGENDAS : "Não foi possível salvar agora. Tente de novo em instantes.";

// --- Cadastro (editar-profissionais) ------------------------------------------

export const criarProfissional = acaoDoPainel({
  permissao: "editar-profissionais",
  senao: VOLTAR,
  ler: (fd, vinculo) => {
    const nome = lerNomeProfissional(texto(fd, "nome"));
    if (!nome.ok) return nome;
    return valido({ nome: nome.valor, member_id: fd.get("sou_eu") === "on" ? vinculo.membroId : null });
  },
  executar: (dados, { supabase, vinculo }) =>
    supabase
      .from("professionals")
      .insert({ ...dados, salon_id: vinculo.salao.id })
      .select("id")
      .single(),
  mensagens: {
    // Dois índices únicos: um login só vira um profissional; nome não se repete no salão.
    duplicado: (e) => (e.message?.includes("member") ? "Você já está cadastrado(a) como profissional." : NOME_REPETIDO),
    outro: LIMITE_OU_GERAL,
  },
  depois: { ir: (p: { id: string }) => `${VOLTAR}/${p.id}` },
});

export const salvarDados = acaoDoPainel({
  permissao: "editar-profissionais",
  senao: VOLTAR,
  ler: (fd) => {
    if (!ehUuid(texto(fd, "id"))) return SEM_ID;
    const nome = lerNomeProfissional(texto(fd, "nome"));
    return nome.ok ? valido({ id: texto(fd, "id"), nome: nome.valor, ativo: fd.get("ativo") === "on" }) : nome;
  },
  executar: ({ id, ...dados }, { supabase, vinculo }) =>
    supabase.from("professionals").update(dados).eq("id", id).eq("salon_id", vinculo.salao.id),
  mensagens: { duplicado: NOME_REPETIDO, outro: LIMITE_OU_GERAL },
  depois: { ok: "Dados salvos." },
});

// Excluir = arquivar: some do painel e da página pública; agendamentos antigos continuam com o nome.
export const excluirProfissional = acaoDoPainel({
  permissao: "editar-profissionais",
  senao: VOLTAR,
  ler: (fd) => (ehUuid(texto(fd, "id")) ? valido({ id: texto(fd, "id") }) : SEM_ID),
  executar: ({ id }, { supabase }) => supabase.rpc("arquivar_profissional", { p_professional: id }),
  mensagens: {
    outro: (e) =>
      Object.entries(ERROS_EXCLUIR_PROFISSIONAL).find(([regra]) => e.message?.includes(regra))?.[1] ??
      "Não foi possível excluir agora. Tente de novo em instantes.",
    "nao-encontrado": "Esse profissional já foi excluído. Recarregue a página.",
  },
  depois: { ir: `${VOLTAR}?aviso=excluido` },
});

export const salvarServicos = acaoDoPainel({
  permissao: "editar-profissionais",
  senao: VOLTAR,
  ler: (fd) =>
    ehUuid(texto(fd, "id"))
      ? valido({ id: texto(fd, "id"), servicos: fd.getAll("servico").filter(ehUuid) })
      : SEM_ID,
  executar: ({ id, servicos }, { supabase }) =>
    supabase.rpc("salvar_servicos_profissional", { p_professional: id, p_servicos: servicos }),
  depois: { ok: "Serviços salvos." },
});

// --- Horário semanal e folgas (editar-horarios) -------------------------------

export const salvarHorarios = acaoDoPainel({
  permissao: "editar-horarios",
  senao: VOLTAR,
  erroDeLeitura: "Confira os dias marcados.",
  ler: (fd) => {
    if (!ehUuid(texto(fd, "id"))) return SEM_ID;
    const dias: DiaTela[] = DIAS.map(({ n }) => ({
      dia: n,
      trabalha: fd.get(`d${n}_trabalha`) === "on",
      inicio: texto(fd, `d${n}_inicio`),
      fim: texto(fd, `d${n}_fim`),
      intervaloInicio: texto(fd, `d${n}_ii`),
      intervaloFim: texto(fd, `d${n}_if`),
    }));
    const { faixas, erros } = telaParaFaixas(dias);
    if (Object.keys(erros).length > 0) {
      return invalido(Object.fromEntries(Object.entries(erros).map(([dia, msg]) => [`d${dia}`, msg])));
    }
    return valido({ id: texto(fd, "id"), faixas });
  },
  executar: ({ id, faixas }, { supabase }) => supabase.rpc("salvar_horarios", { p_professional: id, p_horarios: faixas }),
  mensagens: { conflito: "Há horários que se sobrepõem no mesmo dia." },
  depois: { ok: "Horários salvos." },
});

export const adicionarFolga = acaoDoPainel({
  permissao: "editar-horarios",
  senao: VOLTAR,
  ler: (fd) => {
    if (!ehUuid(texto(fd, "id"))) return SEM_ID;
    const folga = lerFolga({
      modo: texto(fd, "modo"),
      dataInicio: texto(fd, "dataInicio"),
      dataFim: texto(fd, "dataFim"),
      data: texto(fd, "data"),
      horaInicio: texto(fd, "horaInicio"),
      horaFim: texto(fd, "horaFim"),
      motivo: texto(fd, "motivo"),
    });
    return folga.ok ? valido({ id: texto(fd, "id"), ...folga.valor }) : folga;
  },
  // Os horários vão como "horário do salão"; o banco converte para UTC com o fuso do salão.
  executar: ({ id, inicio, fim, motivo }, { supabase }) =>
    supabase.rpc("adicionar_folga", { p_professional: id, p_inicio: inicio, p_fim: fim, p_motivo: motivo }),
  depois: { ok: "Folga adicionada." },
});

export const removerFolga = comandoDoPainel({
  permissao: "editar-horarios",
  senao: VOLTAR,
  ler: (fd) => (ehUuid(texto(fd, "id")) ? texto(fd, "id") : null),
  executar: (id, { supabase, vinculo }) => supabase.from("time_off").delete().eq("id", id).eq("salon_id", vinculo.salao.id).select("id"),
});

// --- Foto (editar-profissionais) ----------------------------------------------
// O arquivo já foi enviado pelo navegador (Storage, policy do Dono(a)); aqui só liga ao profissional
// e apaga a foto anterior.

async function trocarFoto(supabase: Supabase, salaoId: string, id: string, nova: string | null) {
  const atual = await supabase.from("professionals").select("foto_path").eq("salon_id", salaoId).eq("id", id).single();
  if (atual.error) return { data: null, error: atual.error };
  const r = await supabase.from("professionals").update({ foto_path: nova }).eq("salon_id", salaoId).eq("id", id).select("id");
  if (r.error) return r;
  // Nenhuma linha afetada (RLS ou profissional de outro salão) também é erro.
  if (!r.data.length) return { data: null, error: { code: "P0002", message: "profissional_nao_encontrado" } };
  const antiga = atual.data.foto_path;
  if (antiga && antiga !== nova) await supabase.storage.from("fotos").remove([antiga]);
  return r;
}

export const salvarFoto = acaoDoPainel({
  permissao: "editar-profissionais",
  ler: (fd, vinculo) => {
    const id = texto(fd, "id");
    const caminho = texto(fd, "caminho");
    return ehUuid(id) && ehCaminhoDeFoto(vinculo.salao.id, id, caminho)
      ? valido({ id, caminho })
      : invalido<{ id: string; caminho: string }>({ [ERRO_GERAL]: "Não foi possível usar essa imagem. Tente de novo." });
  },
  executar: ({ id, caminho }, { supabase, vinculo }) => trocarFoto(supabase, vinculo.salao.id, id, caminho),
  depois: { ok: "Foto atualizada." },
});

export const removerFoto = acaoDoPainel({
  permissao: "editar-profissionais",
  ler: (fd) => (ehUuid(texto(fd, "id")) ? valido({ id: texto(fd, "id") }) : SEM_ID),
  executar: ({ id }, { supabase, vinculo }) => trocarFoto(supabase, vinculo.salao.id, id, null),
  depois: { ok: "Foto removida." },
});
