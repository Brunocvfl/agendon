// Inscrição de Web Push enviada pelo navegador (PushSubscription.toJSON()). Espelha as restrições de
// push_inscricoes (migration notificacoes): endereço https até 1000, chaves até 200 e 100 caracteres.

export type InscricaoPush = { endpoint: string; p256dh: string; auth: string };

const texto = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.length >= 1 && v.length <= max && !/\s/.test(v) ? v : null;

/** Lê a inscrição vinda do navegador; null se o formato não é o esperado. */
export function lerInscricao(dado: unknown): InscricaoPush | null {
  if (typeof dado !== "object" || dado === null) return null;
  const { endpoint, keys } = dado as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  const url = texto(endpoint, 1000);
  if (!url || !url.startsWith("https://") || url.length < 12) return null;
  const p256dh = texto(keys?.p256dh, 200);
  const auth = texto(keys?.auth, 100);
  return p256dh && auth ? { endpoint: url, p256dh, auth } : null;
}

/** Só o endereço (desligar o aviso neste aparelho). */
export function lerEndereco(dado: unknown): string | null {
  const url = texto(dado, 1000);
  return url && url.startsWith("https://") ? url : null;
}
