// Cliente do Supabase da página pública de agendamento: usa a chave secreta e, por isso, só pode
// chamar as funções feitas para ela (pagina_publica, horarios_publicos, agendar_publico), que
// validam tudo no banco. Nunca usar para ler ou gravar tabelas, nem fora da página pública.
import "server-only";
import { connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

export async function clientePublico() {
  const { url } = supabaseEnv();
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!chave) throw new Error("Falta SUPABASE_SECRET_KEY (só no servidor). Veja o .env.example.");
  await connection();
  return createClient<Database>(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
