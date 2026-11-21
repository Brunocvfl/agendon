// Assinatura do webhook do Mercado Pago. Cabeçalho `x-signature: ts=<segundos>,v1=<hex>`; o v1 é o
// HMAC-SHA256 (hex) do "manifesto" `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` com a chave secreta
// do webhook (Suas integrações > Webhooks). O data.id vem da query string (em minúsculas se tiver
// letras); parte que não veio fica de fora do manifesto. Conferir antes de qualquer outra coisa.
// A documentação não traz o manifesto por extenso: conferir com um aviso de teste do MP (AGE-14).
import { createHmac, timingSafeEqual } from "node:crypto";

export function lerCabecalhoDeAssinatura(cabecalho: string | null): { ts: string; v1: string } | null {
  if (!cabecalho) return null;
  const campos = new Map(
    cabecalho.split(",").map((parte) => {
      const [chave, ...valor] = parte.split("=");
      return [chave.trim(), valor.join("=").trim()] as const;
    }),
  );
  const ts = campos.get("ts");
  const v1 = campos.get("v1");
  return ts && /^\d+$/.test(ts) && v1 && /^[0-9a-f]{64}$/i.test(v1) ? { ts, v1 } : null;
}

export function manifesto(dataId: string | null, requestId: string | null, ts: string): string {
  let m = "";
  if (dataId) m += `id:${/[a-z]/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
  if (requestId) m += `request-id:${requestId};`;
  return `${m}ts:${ts};`;
}

export function assinaturaValida(
  a: { cabecalho: string | null; requestId: string | null; dataId: string | null },
  segredo: string | undefined,
): boolean {
  const lido = lerCabecalhoDeAssinatura(a.cabecalho);
  if (!lido || !segredo) return false;
  const esperado = createHmac("sha256", segredo).update(manifesto(a.dataId, a.requestId, lido.ts)).digest();
  const recebido = Buffer.from(lido.v1, "hex");
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}
