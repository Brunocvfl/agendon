// Cliente do Supabase do envio e do webhook do WhatsApp: usa a chave secreta e, por isso, só pode
// chamar as funções feitas para ele (whatsapp_reservar, whatsapp_resultado, whatsapp_status_meta,
// whatsapp_optout). Nunca usar para ler ou gravar tabelas, nem fora de src/lib/whatsapp e do webhook.
import "server-only";
import { connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

export async function clienteWhatsApp() {
  const { url } = supabaseEnv();
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!chave) throw new Error("Falta SUPABASE_SECRET_KEY (só no servidor). Veja o .env.example.");
  await connection();
  return createClient<Database>(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
