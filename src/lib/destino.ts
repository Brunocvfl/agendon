// Destino seguro depois do login: só caminhos internos (evita redirecionamento aberto).
export function destinoSeguro(next: string | null | undefined, padrao = "/painel") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return padrao;
  }
  return next;
}

// Rotas que exigem login e rotas que só fazem sentido para quem não está logado.
export const ROTAS_PROTEGIDAS = ["/painel", "/criar-salao"];
export const ROTAS_DE_VISITANTE = ["/entrar", "/cadastro"];

export function comecaCom(pathname: string, rotas: string[]) {
  return rotas.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}
