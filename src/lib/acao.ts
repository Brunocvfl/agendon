// Ação do painel: a Server Action padrão. Cada ação declara só o que é dela
// (quem pode, como ler o formulário, o que gravar, o que dizer); o resto acontece aqui:
// vínculo + Permissões, leitura com a regra, tradução dos erros do banco, refresh/redirect.
import "server-only";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { exigirPermissao, type Permissao, type Vinculo } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ErrosPorCampo, Resultado } from "@/lib/regras/resultado";

export type EstadoForm = {
  erro?: string;
  ok?: string;
  erros?: ErrosPorCampo;
  campos?: Record<string, string>;
};

/** Chave de erro que não é de um campo: aparece no alerta do formulário. */
export const ERRO_GERAL = "_geral";

// --- Erros do banco ----------------------------------------------------------

export type ErroBanco = "duplicado" | "conflito" | "sem-permissao" | "invalido" | "nao-encontrado" | "outro";
type ErroPostgres = { code?: string; message?: string };

export function traduzirErroBanco(error: ErroPostgres): ErroBanco {
  switch (error.code) {
    case "23505":
      return "duplicado"; // unique
    case "23P01":
      return "conflito"; // exclusão (horário sobreposto)
    case "42501":
      return "sem-permissao"; // RLS ou checagem nas funções
    case "23514":
    case "22023":
    case "23503":
      return "invalido"; // check, valor inválido, FK
    case "P0002":
      return "nao-encontrado";
    default:
      return "outro";
  }
}

const PADRAO: Record<ErroBanco, string> = {
  duplicado: "Já existe um cadastro com esses dados.",
  conflito: "Há horários que se sobrepõem.",
  "sem-permissao": "Seu perfil não permite essa alteração.",
  invalido: "Algum dado não foi aceito. Confira e tente de novo.",
  "nao-encontrado": "Não encontramos esse cadastro. Recarregue a página.",
  outro: "Não foi possível salvar agora. Tente de novo em instantes.",
};

/** Mensagem para o formulário (texto) ou para um campo ({ campo, msg }); pode depender do erro. */
type Mensagem = string | { campo: string; msg: string };
export type Mensagens = Partial<Record<ErroBanco, Mensagem | ((e: ErroPostgres) => Mensagem)>>;

function mensagemDoErro(error: ErroPostgres, mensagens: Mensagens = {}): Pick<EstadoForm, "erro" | "erros"> {
  const tipo = traduzirErroBanco(error);
  const m = mensagens[tipo];
  const msg = typeof m === "function" ? m(error) : (m ?? PADRAO[tipo]);
  return typeof msg === "string" ? { erro: msg } : { erros: { [msg.campo]: msg.msg } };
}

function estadoDeErros(erros: ErrosPorCampo, erroGeral?: string): Pick<EstadoForm, "erro" | "erros"> {
  const { [ERRO_GERAL]: geral, ...porCampo } = erros;
  return { erro: geral ?? erroGeral, erros: porCampo };
}

// --- Ação com formulário (useActionState) ------------------------------------

type Contexto = { vinculo: Vinculo; supabase: Awaited<ReturnType<typeof createClient>> };
type RespostaBanco<D> = { error: ErroPostgres | null; data?: D | null };

export function acaoDoPainel<T, D = unknown>(def: {
  permissao: Permissao;
  /** Para onde vai quem não tem a permissão. */
  senao?: string;
  /** Campos de texto devolvidos ao formulário quando há erro (para não perder o que foi digitado). */
  devolver?: readonly string[];
  ler: (fd: FormData, vinculo: Vinculo) => Resultado<T>;
  /** Mensagem geral quando a leitura falha só com erros de campo. */
  erroDeLeitura?: string;
  executar: (valor: T, ctx: Contexto) => PromiseLike<RespostaBanco<D>>;
  mensagens?: Mensagens;
  /** Sucesso: mostra `ok` e atualiza a tela, ou vai para outra página (a partir do que o banco devolveu e do que foi lido). */
  depois: { ok: string } | { ir: string | ((data: D, valor: T) => string) };
}) {
  return async function (_anterior: EstadoForm, fd: FormData): Promise<EstadoForm> {
    const vinculo = await exigirPermissao(def.permissao, def.senao);
    const campos = Object.fromEntries((def.devolver ?? []).map((c) => [c, String(fd.get(c) ?? "")]));

    const lido = def.ler(fd, vinculo);
    if (!lido.ok) return { ...estadoDeErros(lido.erros, def.erroDeLeitura), campos };

    const supabase = await createClient();
    const { error, data } = await def.executar(lido.valor, { vinculo, supabase });
    if (error) return { ...mensagemDoErro(error, def.mensagens), campos };

    if ("ir" in def.depois) {
      redirect(typeof def.depois.ir === "function" ? def.depois.ir(data as D, lido.valor) : def.depois.ir);
    }
    refresh();
    return { ok: def.depois.ok };
  };
}

// --- Comando sem formulário (botões: ativar, remover) ------------------------

export function comandoDoPainel<T>(def: {
  permissao: Permissao;
  senao?: string;
  ler: (fd: FormData) => T | null;
  executar: (valor: T, ctx: Contexto) => PromiseLike<RespostaBanco<unknown>>;
}) {
  return async function (fd: FormData): Promise<void> {
    const vinculo = await exigirPermissao(def.permissao, def.senao);
    const valor = def.ler(fd);
    if (valor === null) return;
    const supabase = await createClient();
    await def.executar(valor, { vinculo, supabase });
    refresh();
  };
}

/** Lê um campo de texto do formulário. */
export const texto = (fd: FormData, campo: string) => String(fd.get(campo) ?? "");
