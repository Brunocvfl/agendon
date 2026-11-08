"use server";

import { acaoDoPainel, comandoDoPainel, ERRO_GERAL, texto, type EstadoForm } from "@/lib/acao";
import { ehUuid } from "@/lib/ids";
import { DIAS, telaParaFaixas, type DiaTela } from "@/lib/horarios";
import { lerFolga } from "@/lib/regras/folga";
import { lerNomeProfissional } from "@/lib/regras/profissional";
import { invalido, valido } from "@/lib/regras/resultado";

export type { EstadoForm };

const VOLTAR = "/painel/profissionais";
const SEM_ID = invalido({ [ERRO_GERAL]: "Profissional inválido. Recarregue a página." });
const NOME_REPETIDO = { campo: "nome", msg: "Já existe um profissional com esse nome." };

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
  mensagens: { duplicado: NOME_REPETIDO },
  depois: { ok: "Dados salvos." },
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
  executar: (id, { supabase, vinculo }) => supabase.from("time_off").delete().eq("id", id).eq("salon_id", vinculo.salao.id),
});
