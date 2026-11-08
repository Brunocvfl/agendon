"use server";

import { acaoDoPainel, comandoDoPainel, ERRO_GERAL, texto, type EstadoForm } from "@/lib/acao";
import { ehUuid } from "@/lib/ids";
import { invalido } from "@/lib/regras/resultado";
import { lerServico } from "@/lib/regras/servico";

export type { EstadoForm };

const VOLTAR = "/painel/servicos";

// Cria (sem id) ou edita (com id) um serviço.
export const salvarServico = acaoDoPainel({
  permissao: "editar-servicos",
  senao: VOLTAR,
  devolver: ["nome", "duracao", "preco"],
  ler: (fd) => {
    const id = texto(fd, "id");
    if (id && !ehUuid(id)) return invalido({ [ERRO_GERAL]: "Serviço inválido. Recarregue a página." });
    const lido = lerServico({ nome: texto(fd, "nome"), duracao: texto(fd, "duracao"), preco: texto(fd, "preco") });
    return lido.ok ? { ok: true, valor: { id: id || null, ...lido.valor } } : lido;
  },
  executar: ({ id, ...dados }, { supabase, vinculo }) =>
    id
      ? supabase.from("services").update(dados).eq("id", id).eq("salon_id", vinculo.salao.id)
      : supabase.from("services").insert({ ...dados, salon_id: vinculo.salao.id }),
  mensagens: { duplicado: { campo: "nome", msg: "Já existe um serviço com esse nome." } },
  depois: { ir: VOLTAR },
});

export const alternarAtivo = comandoDoPainel({
  permissao: "editar-servicos",
  senao: VOLTAR,
  ler: (fd) => (ehUuid(texto(fd, "id")) ? { id: texto(fd, "id"), ativo: texto(fd, "ativo") === "true" } : null),
  executar: ({ id, ativo }, { supabase, vinculo }) =>
    supabase.from("services").update({ ativo }).eq("id", id).eq("salon_id", vinculo.salao.id),
});
