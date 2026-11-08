// Variáveis públicas do Supabase. São seguras no navegador: o acesso aos dados é protegido pela RLS.
// Nunca adicionar aqui a chave secreta (SUPABASE_SECRET_KEY): ela é só do servidor.

export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Veja o .env.example.",
    );
  }

  return { url, publishableKey };
}
