// Cliente do Supabase para a API de administração do Auth (convidar, reenviar e cancelar convites).
// Usa a chave secreta: só no servidor, só depois de exigirPermissao("gerenciar-salao"), e só para
// `auth.admin`. Dados do salão (members, professionals) continuam passando pelo cliente do usuário,
// com a RLS valendo.
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

export function authAdmin() {
  const { url } = supabaseEnv();
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!chave) throw new Error("Falta SUPABASE_SECRET_KEY (só no servidor). Veja o .env.example.");
  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }).auth.admin;
}
