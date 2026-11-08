// Renova a sessão do Supabase a cada requisição e devolve os cookies atualizados ao navegador.
// Também faz o redirecionamento "otimista" de rotas; a checagem de verdade fica em src/lib/auth.ts.
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";
import { ROTAS_DE_VISITANTE, ROTAS_PROTEGIDAS, comecaCom } from "@/lib/destino";

export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = supabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // Impede que CDN/proxy guarde em cache uma resposta com o token de outra pessoa.
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Não colocar código entre a criação do cliente e esta chamada: ela valida o JWT e renova o token.
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  if (!logado && comecaCom(pathname, ROTAS_PROTEGIDAS)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/entrar";
    destino.search = `?next=${encodeURIComponent(pathname + search)}`;
    return redirecionar(destino, response);
  }

  if (logado && comecaCom(pathname, ROTAS_DE_VISITANTE)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/painel";
    destino.search = "";
    return redirecionar(destino, response);
  }

  return response;
}

// Redireciona sem perder os cookies de sessão que o Supabase acabou de renovar.
function redirecionar(destino: URL, base: NextResponse) {
  const redirect = NextResponse.redirect(destino);
  base.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  for (const key of ["cache-control", "expires", "pragma"]) {
    const value = base.headers.get(key);
    if (value) redirect.headers.set(key, value);
  }
  return redirect;
}
