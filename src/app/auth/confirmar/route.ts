// Link do e-mail de convite: valida o token (verifyOtp) e abre a sessão da pessoa convidada.
// O convite sai do servidor (auth.admin.inviteUserByEmail), sem o verificador do PKCE, por isso não
// passa pelo /auth/callback. Só aceita o tipo "invite" e sempre segue para /convite.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type");

  if (tokenHash && tipo === "invite") {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type: "invite", token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL("/convite", origin));
  }

  return NextResponse.redirect(new URL("/entrar?aviso=convite", origin));
}
