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
export type Mensagem = string | { campo: string; msg: string };
export type Mensagens = Partial<Record<ErroBanco, Mensagem | ((e: ErroPostgres) => Mensagem)>>;

function mensagemDoErro(error: ErroPostgres, mensagens: Mensagens = {}): Pick<EstadoForm, "erro" | "erros"> {
  const tipo = traduzirErroBanco(error);
  const m = mensagens[tipo];
  return estadoDaMensagem(typeof m === "function" ? m(error) : (m ?? PADRAO[tipo]));
}

function estadoDaMensagem(msg: Mensagem): Pick<EstadoForm, "erro" | "erros"> {
  return typeof msg === "string" ? { erro: msg } : { erros: { [msg.campo]: msg.msg } };
}

function estadoDeErros(erros: ErrosPorCampo, erroGeral?: string): Pick<EstadoForm, "erro" | "erros"> {
  const { [ERRO_GERAL]: geral, ...porCampo } = erros;
  return { erro: geral ?? erroGeral, erros: porCampo };
}

// --- Ação com formulário (useActionState) ------------------------------------

type Contexto = { vinculo: Vinculo; supabase: Awaited<ReturnType<typeof createClient>> };
type RespostaBanco<D> = { error: ErroPostgres | null; data?: D | null };
/** Resposta de um módulo de domínio (ex.: Agendamento): o erro já vem com nome, da lista dele. */
type RespostaDominio<D, E extends string> = { ok: true; data: D } | { ok: false; erro: E };

type Comum<T, D> = {
  permissao: Permissao;
  /** Para onde vai quem não tem a permissão. */
  senao?: string;
  /** Campos de texto devolvidos ao formulário quando há erro (para não perder o que foi digitado). */
  devolver?: readonly string[];
  ler: (fd: FormData, vinculo: Vinculo) => Resultado<T>;
  /** Mensagem geral quando a leitura falha só com erros de campo. */
  erroDeLeitura?: string;
  /** Sucesso: mostra `ok` e atualiza a tela, ou vai para outra página (a partir do que o banco devolveu e do que foi lido). */
  depois: { ok: string } | { ir: string | ((data: D, valor: T) => string) };
};

type DefBanco<T, D> = Comum<T, D> & {
  executar: (valor: T, ctx: Contexto) => PromiseLike<RespostaBanco<D>>;
  mensagens?: Mensagens;
};

type DefDominio<T, D, E extends string> = Comum<T, D> & {
  executar: (valor: T, ctx: Contexto) => PromiseLike<RespostaDominio<D, E>>;
  /** Um texto para cada erro que a operação pode devolver (o TypeScript cobra os que faltarem). */
  mensagens: Record<NoInfer<E>, Mensagem>;
};

type Acao = (anterior: EstadoForm, fd: FormData) => Promise<EstadoForm>;

export function acaoDoPainel<T, D, E extends string>(def: DefDominio<T, D, E>): Acao;
export function acaoDoPainel<T, D = unknown>(def: DefBanco<T, D>): Acao;
export function acaoDoPainel<T, D>(def: DefBanco<T, D> | DefDominio<T, D, string>): Acao {
  return async function (_anterior: EstadoForm, fd: FormData): Promise<EstadoForm> {
    const vinculo = await exigirPermissao(def.permissao, def.senao);
    const campos = Object.fromEntries((def.devolver ?? []).map((c) => [c, String(fd.get(c) ?? "")]));

    const lido = def.ler(fd, vinculo);
    if (!lido.ok) return { ...estadoDeErros(lido.erros, def.erroDeLeitura), campos };

    const supabase = await createClient();
    const resposta = await def.executar(lido.valor, { vinculo, supabase });
    let data: D | null | undefined;
    if ("ok" in resposta) {
      if (!resposta.ok) return { ...estadoDaMensagem((def as DefDominio<T, D, string>).mensagens[resposta.erro]), campos };
      data = resposta.data;
    } else {
      if (resposta.error) return { ...mensagemDoErro(resposta.error, (def as DefBanco<T, D>).mensagens), campos };
      data = resposta.data;
    }

    if ("ir" in def.depois) {
      redirect(typeof def.depois.ir === "function" ? def.depois.ir(data as D, lido.valor) : def.depois.ir);
    }
    refresh();
    return { ok: def.depois.ok };
  };
}

// --- Comando sem formulário (botões: ativar, remover) ------------------------

/** O que o botão mostra: nada (deu certo, a tela atualiza) ou o erro. */
export type ResultadoComando = { erro?: string };

const RECARREGUE = "Recarregue a página e tente de novo.";

export function comandoDoPainel<T>(def: {
  permissao: Permissao;
  senao?: string;
  ler: (fd: FormData) => T | null;
  /**
   * Devolva as linhas afetadas (`.select("id")`): nenhuma linha (id que não existe ou que a RLS
   * esconde) também é erro, em vez de um sucesso silencioso.
   */
  executar: (valor: T, ctx: Contexto) => PromiseLike<RespostaBanco<unknown>>;
  mensagens?: Mensagens;
}) {
  return async function (fd: FormData): Promise<ResultadoComando> {
    const vinculo = await exigirPermissao(def.permissao, def.senao);
    const valor = def.ler(fd);
    if (valor === null) return { erro: RECARREGUE };
    const supabase = await createClient();
    const { error, data } = await def.executar(valor, { vinculo, supabase });
    if (error) {
      const m = mensagemDoErro(error, def.mensagens);
      return { erro: m.erro ?? Object.values(m.erros ?? {})[0] ?? PADRAO.outro };
    }
    if (Array.isArray(data) && data.length === 0) return { erro: PADRAO["nao-encontrado"] };
    refresh();
    return {};
  };
}

/** Lê um campo de texto do formulário. */
export const texto = (fd: FormData, campo: string) => String(fd.get(campo) ?? "");
