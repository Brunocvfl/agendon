// Origem do site para os links dos e-mails de autenticação (confirmação, senha, convite).
// Na nuvem vem da requisição (validada pela lista de retorno do Supabase); local pode ser fixada.
import "server-only";
import { headers } from "next/headers";

export async function urlDoSite() {
  const configurada = process.env.NEXT_PUBLIC_SITE_URL;
  if (configurada) return configurada.replace(/\/$/, "");
  const h = await headers();
  return h.get("origin") ?? "http://localhost:3000";
}
