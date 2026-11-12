// Assinatura do webhook da Meta: o cabeçalho X-Hub-Signature-256 é "sha256=" + HMAC-SHA256 do corpo
// bruto, com o segredo do app (META_APP_SECRET). Conferir sempre antes de ler o JSON.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function assinaturaValida(corpo: Buffer | string, cabecalho: string | null, segredo: string): boolean {
  if (!cabecalho || !segredo) return false;
  const m = /^sha256=([0-9a-f]{64})$/i.exec(cabecalho.trim());
  if (!m) return false;
  const esperado = createHmac("sha256", segredo).update(corpo).digest();
  const recebido = Buffer.from(m[1], "hex");
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}

/** Comparação em tempo constante de dois textos (ex.: token de verificação do webhook). */
export function textosIguais(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
