// FilaWhatsApp: a fila de saída (message_log) vista pelo servidor. Só estas operações, por funções
// próprias do banco (whatsapp_*); nada de ler tabelas. O adapter de verdade usa a chave secreta;
// os testes usam uma fila falsa. Cada operação lança erro se o banco falhar.
import "server-only";
import { connection } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
import { paraRpc } from "@/lib/supabase/rpc";
import { clienteSecreto } from "@/lib/supabase/secreto";

/** Mensagem reservada para envio, com o que o template precisa (telefone e nome só na memória). */
export type MensagemReservada = Database["public"]["Functions"]["whatsapp_reservar"]["Returns"][number];

/** Depois de tentar enviar: enviada, de volta à fila (tentar depois) ou falha definitiva. */
export type StatusDoEnvio = "enviada" | "na_fila" | "falhou";

export interface FilaWhatsApp {
  /** Reserva até `limite` mensagens (descarta as que perderam o sentido). */
  reservar(limite: number): Promise<MensagemReservada[]>;
  /** Grava o resultado do envio: o wamid da Meta, ou o erro. */
  resultado(id: string, status: StatusDoEnvio, detalhe: { wamid?: string; erro?: string }): Promise<void>;
  /** Status que chegou pelo webhook (entregue, lida, falhou…); nunca volta para trás. */
  statusDaMeta(wamid: string, status: string, erro: string | null): Promise<void>;
  /** SAIR: todas as formas do número de quem pediu para não receber mais. Devolve quantos clientes saíram agora. */
  optout(telefones: string[]): Promise<number>;
}

type Funcoes = "whatsapp_reservar" | "whatsapp_resultado" | "whatsapp_status_meta" | "whatsapp_optout";

function falhou(fn: string, error: { code?: string } | null) {
  if (error) throw new Error(`${fn} falhou (${error.code ?? "sem código"})`);
}

export async function filaWhatsApp(): Promise<FilaWhatsApp> {
  await connection();
  const db = paraRpc<Funcoes>(clienteSecreto());
  // Os tipos gerados não aceitam null nos parâmetros opcionais; as funções do banco tratam null.
  const nulo = null as unknown as string;
  return {
    async reservar(limite) {
      const { data, error } = await db.rpc("whatsapp_reservar", { p_limite: limite });
      falhou("whatsapp_reservar", error);
      return data ?? [];
    },
    async resultado(id, status, { wamid, erro }) {
      const { error } = await db.rpc("whatsapp_resultado", { p_id: id, p_status: status, p_wamid: wamid ?? nulo, p_erro: erro ?? nulo });
      falhou("whatsapp_resultado", error);
    },
    async statusDaMeta(wamid, status, erro) {
      const { error } = await db.rpc("whatsapp_status_meta", { p_wamid: wamid, p_status: status, p_erro: erro ?? nulo });
      falhou("whatsapp_status_meta", error);
    },
    async optout(telefones) {
      const { data, error } = await db.rpc("whatsapp_optout", { p_telefones: telefones });
      falhou("whatsapp_optout", error);
      return data ?? 0;
    },
  };
}
