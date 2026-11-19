// Origem pública (https://domínio) de uma requisição recebida por uma rota do app, para redirecionar
// de volta ao site. Atrás de um proxy (Caddy na VPS, Vercel), `request.nextUrl.origin` do servidor
// standalone é o endereço interno do contêiner (https://0.0.0.0:3000), então o domínio vem de
// X-Forwarded-Host/Host e o protocolo de X-Forwarded-Proto. Valor fora do formato de host é ignorado.
const HOST = /^[a-z0-9.-]+(:\d{1,5})?$/i;

export function origemPublica(request: Request): string {
  const url = new URL(request.url);
  const primeiro = (nome: string) => request.headers.get(nome)?.split(",")[0]?.trim() || null;

  const candidatos = [primeiro("x-forwarded-host"), primeiro("host")];
  const host = candidatos.find((h): h is string => Boolean(h && HOST.test(h))) ?? url.host;

  const proto = primeiro("x-forwarded-proto");
  const protocolo = proto === "https" || proto === "http" ? proto : url.protocol.replace(":", "");

  return `${protocolo}://${host}`;
}
