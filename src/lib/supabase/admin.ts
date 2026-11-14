// Cliente do Supabase para a API de administração do Auth (convidar, reenviar e cancelar convites).
// Usa a chave secreta: só no servidor, só depois de exigirPermissao("gerenciar-salao"), e só para
// `auth.admin`. Dados do salão (members, professionals) continuam passando pelo cliente do usuário,
// com a RLS valendo.
import "server-only";
import { clienteSecreto } from "./secreto";

export function authAdmin() {
  return clienteSecreto().auth.admin;
}
