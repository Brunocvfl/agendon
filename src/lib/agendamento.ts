// Agendamento: criar, remarcar, mudar status e agendar pela página pública, e os horários livres.
// Esconde as funções do banco (nomes, parâmetros p_*, tipos gerados), traduz os erros para uma
// lista fechada e avisa a fila do WhatsApp e a dos avisos da equipe (Web Push). Quem chama passa o cliente Supabase (o do usuário no
// painel, por causa da RLS; o da chave secreta na página pública) e transforma o erro em texto.
import "server-only";
import { after } from "next/server";
import { ehData } from "@/lib/datas";
import { ehUuid } from "@/lib/ids";
import type { AgendamentoPublicoValido, AgendamentoValido, RemarcacaoValida, Status } from "@/lib/regras/agendamento";
import type { NomeRpc, Rpc } from "@/lib/supabase/rpc";
import { processarPush } from "@/lib/push/enviar";
import { processarFila } from "@/lib/whatsapp/enviar";

// --- Erros ---------------------------------------------------------------------

export type ErroAgendamento =
  | "ocupado"
  | "fora-do-expediente"
  | "servico-nao-atendido"
  | "cliente-invalido"
  | "cliente-nao-encontrado"
  | "transicao-invalida"
  | "ainda-nao-comecou"
  | "muitas-tentativas"
  | "muitos-agendamentos"
  | "telefone-invalido"
  | "salao-indisponivel"
  | "dado-invalido"
  | "sem-permissao"
  | "nao-encontrado"
  | "outro";

const ERROS_CRIAR = [
  "ocupado", "fora-do-expediente", "servico-nao-atendido", "cliente-invalido", "cliente-nao-encontrado",
  "dado-invalido", "sem-permissao", "nao-encontrado", "outro",
] as const satisfies readonly ErroAgendamento[];
const ERROS_REMARCAR = [
  "ocupado", "fora-do-expediente", "servico-nao-atendido", "transicao-invalida",
  "dado-invalido", "sem-permissao", "nao-encontrado", "outro",
] as const satisfies readonly ErroAgendamento[];
const ERROS_STATUS = [
  "ocupado", "transicao-invalida", "ainda-nao-comecou", "dado-invalido", "sem-permissao", "nao-encontrado", "outro",
] as const satisfies readonly ErroAgendamento[];
const ERROS_PUBLICO = [
  "ocupado", "muitas-tentativas", "muitos-agendamentos", "telefone-invalido", "servico-nao-atendido",
  "salao-indisponivel", "dado-invalido", "outro",
] as const satisfies readonly ErroAgendamento[];

export type ErroCriar = (typeof ERROS_CRIAR)[number];
export type ErroRemarcar = (typeof ERROS_REMARCAR)[number];
export type ErroStatus = (typeof ERROS_STATUS)[number];
export type ErroPublico = (typeof ERROS_PUBLICO)[number];

/** Deu certo (com o que o banco devolveu) ou um erro da lista da operação. */
export type Resposta<D, E extends ErroAgendamento> = { ok: true; data: D } | { ok: false; erro: E };

type ErroPostgres = { code?: string; message?: string };

// Mensagens estáveis que as funções do banco levantam (raise exception '<token>').
const TOKENS: Record<string, ErroAgendamento> = {
  fora_do_expediente: "fora-do-expediente",
  servico_nao_atendido: "servico-nao-atendido",
  cliente_nao_encontrado: "cliente-nao-encontrado",
  transicao_invalida: "transicao-invalida",
  ainda_nao_comecou: "ainda-nao-comecou",
  muitas_tentativas: "muitas-tentativas",
  muitos_agendamentos: "muitos-agendamentos",
  telefone_invalido: "telefone-invalido",
  salao_nao_encontrado: "salao-indisponivel",
};

function tipoDoErro(e: ErroPostgres): ErroAgendamento {
  const token = TOKENS[e.message ?? ""];
  if (token) return token;
  // Restrições da tabela clients (nome, WhatsApp) violadas ao cadastrar o cliente novo.
  if (e.message?.includes("clients_")) return "cliente-invalido";
  switch (e.code) {
    case "23P01":
      return "ocupado";
    case "42501":
      return "sem-permissao";
    case "P0002":
      return "nao-encontrado";
    case "22023":
    case "23514":
    case "23503":
      return "dado-invalido";
    default:
      return "outro";
  }
}

function erroDa<E extends ErroAgendamento>(e: ErroPostgres, permitidos: readonly E[]): { ok: false; erro: E } {
  const tipo = tipoDoErro(e);
  const erro = (permitidos as readonly ErroAgendamento[]).includes(tipo) ? (tipo as E) : ("outro" as E);
  // Só o código: a mensagem do banco pode trazer detalhes de dado.
  if (erro === "outro") console.error(`agendamento: erro inesperado do banco (${e.code ?? "sem código"})`);
  return { ok: false, erro };
}

// --- Dependências --------------------------------------------------------------

/** `F`: as funções do banco que a operação chama (a página pública só tem as dela). */
type Deps<F extends NomeRpc> = {
  /** Cliente do usuário (painel) ou da chave secreta (página pública). */
  supabase: Rpc<F>;
  /** Envia o que está na fila do WhatsApp (e os avisos da equipe) depois da resposta. Troca nos testes. */
  avisarFila?: () => void;
};

const avisarFilaPadrao = () =>
  after(async () => {
    await Promise.all([
      processarFila().catch((e) => console.error(e instanceof Error ? e.message : "whatsapp: fila falhou")),
      // Avisos da equipe: só nascem de agendamento pela página pública (gatilho do banco).
      processarPush().catch((e) => console.error(e instanceof Error ? e.message : "push: fila falhou")),
    ]);
  });

// --- Operações -----------------------------------------------------------------

/** Agendamento pelo painel. O gatilho do banco põe a confirmação na fila (se o cliente deu opt-in). */
export async function criar(a: AgendamentoValido, deps: Deps<"criar_agendamento">): Promise<Resposta<string, ErroCriar>> {
  const { data, error } = await deps.supabase.rpc("criar_agendamento", {
    p_professional: a.profissional,
    p_service: a.servico,
    p_inicio: a.inicio,
    p_encaixe: a.encaixe,
    ...("id" in a.cliente
      ? { p_client: a.cliente.id }
      : { p_cliente_nome: a.cliente.nome, p_cliente_telefone: a.cliente.telefone }),
  });
  if (error) return erroDa(error, ERROS_CRIAR);
  (deps.avisarFila ?? avisarFilaPadrao)();
  return { ok: true, data: data as string };
}

/** Novo dia, hora e (opcionalmente) profissional. Serviço, cliente e preço não mudam. */
export async function remarcar(r: RemarcacaoValida, deps: Deps<"remarcar_agendamento">): Promise<Resposta<null, ErroRemarcar>> {
  const { error } = await deps.supabase.rpc("remarcar_agendamento", {
    p_appointment: r.id,
    p_professional: r.profissional,
    p_inicio: r.inicio,
    p_encaixe: r.encaixe,
  });
  return error ? erroDa(error, ERROS_REMARCAR) : { ok: true, data: null };
}

export async function mudarStatus(v: { id: string; status: Status }, deps: Deps<"mudar_status">): Promise<Resposta<null, ErroStatus>> {
  const { error } = await deps.supabase.rpc("mudar_status", { p_appointment: v.id, p_status: v.status });
  return error ? erroDa(error, ERROS_STATUS) : { ok: true, data: null };
}

export type Confirmacao = { servico: string; profissional: string; inicio: string; fim: string; preco: number };

/**
 * Agendamento feito pelo cliente na página pública (só com a chave secreta: o servidor já conferiu
 * o CAPTCHA). `origem`: hash do IP, para o limite por hora.
 */
export async function agendarPublico(
  slug: string,
  a: AgendamentoPublicoValido,
  origem: string,
  deps: Deps<"agendar_publico">,
): Promise<Resposta<Confirmacao, ErroPublico>> {
  const { data, error } = await deps.supabase.rpc("agendar_publico", {
    p_slug: slug,
    p_service: a.servico,
    // O tipo gerado não aceita null, mas a função trata null como "qualquer profissional".
    p_professional: a.profissional as string,
    p_inicio: a.inicio,
    p_nome: a.nome,
    p_telefone: a.telefone,
    p_optin: a.optin,
    p_origem: origem,
    ...(a.atendido ? { p_atendido: a.atendido } : {}),
  });
  if (error) return erroDa(error, ERROS_PUBLICO);
  const r = data?.[0];
  if (!r) throw new Error("agendar_publico não devolveu o agendamento");
  (deps.avisarFila ?? avisarFilaPadrao)();
  return { ok: true, data: { servico: r.servico, profissional: r.profissional, inicio: r.inicio, fim: r.fim, preco: r.preco } };
}

/**
 * Horários livres (instantes ISO) de um profissional para um serviço num dia ("AAAA-MM-DD").
 * `ignorar`: o agendamento que está sendo remarcado (não ocupa o próprio horário).
 * Entrada inválida = nenhum horário.
 */
export async function horariosLivres(
  q: { profissional: string; servico: string; dia: string; ignorar?: string },
  deps: Deps<"horarios_livres">,
): Promise<Resposta<string[], "outro">> {
  if (!ehUuid(q.profissional) || !ehUuid(q.servico) || !ehData(q.dia)) return { ok: true, data: [] };
  const { data, error } = await deps.supabase.rpc("horarios_livres", {
    p_professional: q.profissional,
    p_service: q.servico,
    p_dia: q.dia,
    ...(q.ignorar && ehUuid(q.ignorar) ? { p_ignorar: q.ignorar } : {}),
  });
  return error ? erroDa(error, ["outro"] as const) : { ok: true, data: data ?? [] };
}

/** Horários livres da página pública (instantes ISO). `profissional` null = qualquer um. */
export async function horariosPublicos(
  q: { slug: string; servico: string; profissional: string | null; dia: string },
  deps: Deps<"horarios_publicos">,
): Promise<Resposta<string[], "outro">> {
  if (!ehUuid(q.servico) || (q.profissional !== null && !ehUuid(q.profissional)) || !ehData(q.dia)) {
    return { ok: true, data: [] };
  }
  const { data, error } = await deps.supabase.rpc("horarios_publicos", {
    p_slug: q.slug,
    p_service: q.servico,
    p_professional: q.profissional as string,
    p_dia: q.dia,
  });
  return error ? erroDa(error, ["outro"] as const) : { ok: true, data: data ?? [] };
}
