"use server";

import { acaoDoPainel, ERRO_GERAL, texto, type EstadoForm } from "@/lib/acao";
import { ehUuid } from "@/lib/ids";
import { lerCliente } from "@/lib/regras/cliente";
import { invalido } from "@/lib/regras/resultado";

export type { EstadoForm };

const VOLTAR = "/painel";
const CAMPOS = ["nome", "telefone", "observacoes"] as const;
const DUPLICADO = { duplicado: { campo: "telefone", msg: "Já existe um cliente com esse WhatsApp." } };

const ler = (fd: FormData) =>
  lerCliente({ nome: texto(fd, "nome"), telefone: texto(fd, "telefone"), observacoes: texto(fd, "observacoes") });

export const criarCliente = acaoDoPainel({
  permissao: "ver-clientes",
  senao: VOLTAR,
  devolver: CAMPOS,
  ler,
  executar: (dados, { supabase, vinculo }) =>
    supabase
      .from("clients")
      .insert({ ...dados, salon_id: vinculo.salao.id })
      .select("id")
      .single(),
  mensagens: DUPLICADO,
  depois: { ir: (data: { id: string }) => `/painel/clientes/${data.id}` },
});

export const salvarCliente = acaoDoPainel({
  permissao: "ver-clientes",
  senao: VOLTAR,
  devolver: CAMPOS,
  ler: (fd) => {
    const id = texto(fd, "id");
    if (!ehUuid(id)) return invalido({ [ERRO_GERAL]: "Cliente inválido. Recarregue a página." });
    const lido = ler(fd);
    return lido.ok ? { ok: true as const, valor: { id, ...lido.valor } } : lido;
  },
  executar: ({ id, ...dados }, { supabase, vinculo }) =>
    supabase.from("clients").update(dados).eq("id", id).eq("salon_id", vinculo.salao.id).is("anonimizado_em", null),
  mensagens: DUPLICADO,
  depois: { ok: "Dados salvos." },
});
