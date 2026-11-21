// Origem pública (https://domínio) de uma requisição recebida pelo app, para redirecionar de volta ao
// site ou montar URLs para fora (retorno e aviso do checkout). Atrás de um proxy (Caddy na VPS, Vercel),
// `request.nextUrl.origin` do servidor standalone é o endereço interno do contêiner (https://0.0.0.0:3000),
// então o domínio vem de X-Forwarded-Host/Host e o protocolo de X-Forwarded-Proto. Valor fora do formato
// de host é ignorado.
const HOST = /^[a-z0-9.-]+(:\d{1,5})?$/i;

/** A origem pelos cabeçalhos; `url` é o endereço que o servidor viu (o padrão quando faltam cabeçalhos). */
export function origemDosCabecalhos(headers: Headers, url: URL | null = null): string {
  const primeiro = (nome: string) => headers.get(nome)?.split(",")[0]?.trim() || null;

  const candidatos = [primeiro("x-forwarded-host"), primeiro("host")];
  const host = candidatos.find((h): h is string => Boolean(h && HOST.test(h))) ?? url?.host ?? "localhost:3000";

  const proto = primeiro("x-forwarded-proto");
  const protocolo =
    proto === "https" || proto === "http" ? proto : (url?.protocol.replace(":", "") ?? "http");

  return `${protocolo}://${host}`;
}

export function origemPublica(request: Request): string {
  return origemDosCabecalhos(request.headers, new URL(request.url));
}
