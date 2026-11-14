// Cliente da página pública de agendamento. Usa a chave secreta e, por isso, só chama as funções feitas
// para ela, que validam tudo no banco: o tipo não deixa ler tabelas nem chamar outra função.
import "server-only";
import { connection } from "next/server";
import { paraRpc, type Rpc } from "./rpc";
import { clienteSecreto } from "./secreto";

export type ClientePublico = Rpc<"pagina_publica" | "horarios_publicos" | "agendar_publico">;

export async function clientePublico(): Promise<ClientePublico> {
  await connection();
  return paraRpc(clienteSecreto());
}
