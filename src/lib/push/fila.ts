// FilaPush: os avisos da equipe (notificacoes) vistos pelo servidor, para o envio por Web Push.
// Só estas operações, por funções próprias do banco (push_*); nada de ler tabelas. O adapter de
// verdade usa a chave secreta; os testes usam uma fila falsa. Cada operação lança erro se o banco falhar.
import "server-only";
import { connection } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
import { paraRpc } from "@/lib/supabase/rpc";
import { clienteSecreto } from "@/lib/supabase/secreto";

/** Um aviso reservado para um aparelho, com o texto (nome e serviço só na memória). */
export type AvisoReservado = Database["public"]["Functions"]["push_reservar"]["Returns"][number];

export interface FilaPush {
  /** Reserva até `limite` avisos; uma linha por aparelho. */
  reservar(limite: number): Promise<AvisoReservado[]>;
  /** Chegou a pelo menos um aparelho (enviada) ou a nenhum (falhou). */
  resultado(notificacaoId: string, status: "enviada" | "falhou"): Promise<void>;
  /** O serviço de push disse que o aparelho não existe mais. */
  removerInscricao(inscricaoId: string): Promise<void>;
}

type Funcoes = "push_reservar" | "push_resultado" | "push_remover_inscricao";

function falhou(fn: string, error: { code?: string } | null) {
  if (error) throw new Error(`${fn} falhou (${error.code ?? "sem código"})`);
}

export async function filaPush(): Promise<FilaPush> {
  await connection();
  const db = paraRpc<Funcoes>(clienteSecreto());
  return {
    async reservar(limite) {
      const { data, error } = await db.rpc("push_reservar", { p_limite: limite });
      falhou("push_reservar", error);
      return data ?? [];
    },
    async resultado(notificacaoId, status) {
      const { error } = await db.rpc("push_resultado", { p_notificacao: notificacaoId, p_status: status });
      falhou("push_resultado", error);
    },
    async removerInscricao(inscricaoId) {
      const { error } = await db.rpc("push_remover_inscricao", { p_inscricao: inscricaoId });
      falhou("push_remover_inscricao", error);
    },
  };
}
