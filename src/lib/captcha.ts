// CAPTCHA da página pública (Cloudflare Turnstile): o servidor confere o token antes de agendar.
// Local e previews usam as chaves de teste da Cloudflare (sempre passam); produção, as chaves reais.
import "server-only";

const VERIFICAR = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function captchaValido(token: string, ip: string | null): Promise<boolean> {
  const segredo = process.env.TURNSTILE_SECRET_KEY;
  if (!segredo) throw new Error("Falta TURNSTILE_SECRET_KEY (só no servidor). Veja o .env.example.");
  if (!token || token.length > 2048) return false;

  const corpo = new URLSearchParams({ secret: segredo, response: token });
  if (ip) corpo.set("remoteip", ip);
  try {
    const resposta = await fetch(VERIFICAR, { method: "POST", body: corpo, signal: AbortSignal.timeout(8000) });
    const dados = (await resposta.json()) as { success?: boolean };
    return dados.success === true;
  } catch {
    return false;
  }
}
