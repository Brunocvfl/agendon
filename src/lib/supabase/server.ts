// Cliente do Supabase para Server Components, Server Actions e Route Handlers.
// Crie um cliente novo por requisição; nunca reaproveite entre requisições.
import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

export async function createClient() {
  const { url, publishableKey } = supabaseEnv();
  const cookieStore = await cookies();
  // Dados de sessão são sempre da requisição: o Supabase usa Date.now() para checar o token,
  // e o Next (Cache Components) exige connection() antes disso.
  await connection();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components não podem gravar cookies. O proxy (src/proxy.ts) renova a sessão.
        }
      },
    },
  });
}
