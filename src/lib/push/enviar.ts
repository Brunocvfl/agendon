// Envio dos avisos da equipe por Web Push. Chamado em after() depois de um agendamento pela página
// pública. Nome e serviço existem aqui só na memória e nunca vão para log; o conteúdo vai
// criptografado até o aparelho (padrão do Web Push).
import "server-only";
import webpush from "web-push";
import { avisoDeAgendamento } from "./aviso";
import { filaPush, type FilaPush } from "./fila";

export const LOTE_PUSH = 20;
/** O aviso perde o sentido depois de 30 min (o serviço de push descarta se o aparelho não aparecer). */
const VALIDADE_S = 30 * 60;

export type ResumoDoPush = { enviadas: number; falhas: number };

type Vapid = { publica?: string; privada?: string; assunto?: string };

/** Envia um aviso para um aparelho. Devolve o status HTTP do serviço de push (ou lança). */
export type EnviarPush = (
  inscricao: { endpoint: string; keys: { p256dh: string; auth: string } },
  conteudo: string,
  vapid: Required<Vapid>,
) => Promise<number>;

/** Tudo é opcional: sem nada, usa a fila de verdade, o web-push e as variáveis de ambiente. */
export type DepsDoPush = { fila?: FilaPush; enviar?: EnviarPush; vapid?: Vapid };

const vapidDoAmbiente = (): Vapid => ({
  publica: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  privada: process.env.VAPID_PRIVATE_KEY,
  assunto: process.env.VAPID_SUBJECT,
});

const enviarComWebPush: EnviarPush = async (inscricao, conteudo, vapid) => {
  try {
    const r = await webpush.sendNotification(inscricao, conteudo, {
      vapidDetails: { subject: vapid.assunto, publicKey: vapid.publica, privateKey: vapid.privada },
      TTL: VALIDADE_S,
      urgency: "high",
      timeout: 10_000,
    });
    return r.statusCode;
  } catch (e) {
    if (e instanceof webpush.WebPushError) return e.statusCode;
    throw e;
  }
};

/** Aparelho que não existe mais (a pessoa desinstalou, limpou os dados ou negou a permissão). */
const aparelhoSumiu = (status: number) => status === 404 || status === 410;

/** Um lote: reserva os avisos, envia para cada aparelho e grava o resultado de cada aviso. */
export async function processarPush(deps: DepsDoPush = {}): Promise<ResumoDoPush> {
  const resumo: ResumoDoPush = { enviadas: 0, falhas: 0 };
  const { publica, privada, assunto } = deps.vapid ?? vapidDoAmbiente();
  if (!publica || !privada || !assunto) {
    console.warn("push: faltam NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e/ou VAPID_SUBJECT; avisos não enviados.");
    return resumo;
  }
  const vapid = { publica, privada, assunto };
  const enviar = deps.enviar ?? enviarComWebPush;
  const fila = deps.fila ?? (await filaPush());

  // Uma linha por aparelho; o aviso deu certo se chegou a pelo menos um.
  const chegou = new Map<string, boolean>();
  for (const a of await fila.reservar(LOTE_PUSH)) {
    const aviso = avisoDeAgendamento({ appointmentId: a.appointment_id, cliente: a.cliente, servico: a.servico });
    let status = 0;
    try {
      status = await enviar({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, JSON.stringify(aviso), vapid);
    } catch {
      status = 0; // sem resposta
    }
    const ok = status >= 200 && status < 300;
    chegou.set(a.notificacao_id, (chegou.get(a.notificacao_id) ?? false) || ok);
    if (aparelhoSumiu(status)) {
      await fila.removerInscricao(a.inscricao_id).catch(() => console.error("push: aparelho não removido"));
    } else if (!ok) {
      console.error(`push: aviso ${a.notificacao_id} não entregue (${status || "sem resposta"})`);
    }
  }

  for (const [id, ok] of chegou) {
    try {
      await fila.resultado(id, ok ? "enviada" : "falhou");
    } catch (e) {
      console.error(`push: resultado não gravado (${e instanceof Error ? e.message : "erro"}), aviso ${id}`);
    }
    if (ok) resumo.enviadas++;
    else resumo.falhas++;
  }
  return resumo;
}
