// A chave secreta do Supabase (ignora a RLS). Só no servidor, e nunca usada direto: cada uso recebe
// um tipo restrito ao que pode fazer (clientePublico, filaWhatsApp, filaPush, authAdmin).
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

export function clienteSecreto() {
  const { url } = supabaseEnv();
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!chave) throw new Error("Falta SUPABASE_SECRET_KEY (só no servidor). Veja o .env.example.");
  return createClient<Database>(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
