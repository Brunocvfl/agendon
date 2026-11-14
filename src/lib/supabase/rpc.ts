// Tipos das chamadas a funções do banco (RPC), restritos a uma lista de nomes. Servem para dar a cada
// uso da chave secreta só as funções que ele pode chamar: o resto (tabelas, outras funções) não compila.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

type Funcoes = Database["public"]["Functions"];
export type NomeRpc = keyof Funcoes;
export type ErroRpc = { code?: string; message?: string };
// Funções sem retorno (void): o tipo do Supabase para `data` é uma mensagem de erro; aqui vira unknown.
type Dados = { [K in NomeRpc]: Funcoes[K]["Returns"] extends undefined ? unknown : Funcoes[K]["Returns"] | null };
export type RespostaRpc<F extends NomeRpc> = { data: Dados[F]; error: ErroRpc | null };

/** Um cliente que só sabe chamar as funções `N`. */
export type Rpc<N extends NomeRpc = NomeRpc> = {
  rpc<F extends N>(fn: F, args: Funcoes[F]["Args"]): PromiseLike<RespostaRpc<F>>;
};

/**
 * Restringe um cliente do Supabase às funções `N`. A conversão é só de tipo (os genéricos do
 * supabase-js não se comparam com os nossos): o objeto é o mesmo, mas quem recebe só enxerga `rpc`
 * com esses nomes.
 */
export function paraRpc<N extends NomeRpc>(cliente: SupabaseClient<Database>): Rpc<N> {
  return cliente as unknown as Rpc<N>;
}
