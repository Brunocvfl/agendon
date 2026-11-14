// Envio das mensagens da fila pela Cloud API da Meta. Chamado depois de um agendamento (after()) e pelo
// job do pg_cron a cada 15 min (rota /api/whatsapp/processar: lembretes e novas tentativas).
// Telefone e nome do cliente existem aqui só na memória, durante o envio, e nunca vão para log.
import "server-only";
import { filaWhatsApp, type FilaWhatsApp, type StatusDoEnvio } from "./fila";
import { lerRespostaDaMeta } from "./graph";
import { montarMensagem } from "./template";

export const LOTE = 10;
const VERSAO_PADRAO = "v23.0";

export type ResumoDoEnvio = { enviadas: number; falhas: number; adiadas: number };

type Credenciais = { token?: string; numeroId?: string; versao?: string };

/** Tudo é opcional: sem nada, usa a fila de verdade, o fetch global e as variáveis de ambiente. */
export type DepsDoEnvio = {
  fila?: FilaWhatsApp | (() => Promise<FilaWhatsApp>);
  fetch?: typeof fetch;
  credenciais?: Credenciais;
};

const credenciaisDoAmbiente = (): Credenciais => ({
  token: process.env.META_ACCESS_TOKEN,
  numeroId: process.env.META_PHONE_NUMBER_ID,
  versao: process.env.META_GRAPH_VERSION,
});

/** Um lote: reserva até LOTE mensagens, envia cada uma e grava o resultado. */
export async function processarFila(deps: DepsDoEnvio = {}): Promise<ResumoDoEnvio> {
  const resumo: ResumoDoEnvio = { enviadas: 0, falhas: 0, adiadas: 0 };
  const { token, numeroId, versao } = deps.credenciais ?? credenciaisDoAmbiente();
  if (!token || !numeroId) {
    // Sem credenciais (ex.: ambiente local): a fila fica como está.
    console.warn("whatsapp: faltam META_ACCESS_TOKEN e/ou META_PHONE_NUMBER_ID; fila não processada.");
    return resumo;
  }
  const url = `https://graph.facebook.com/${versao || VERSAO_PADRAO}/${numeroId}/messages`;
  const enviar = deps.fetch ?? fetch;
  const fila = typeof deps.fila === "function" ? await deps.fila() : (deps.fila ?? (await filaWhatsApp()));

  for (const m of await fila.reservar(LOTE)) {
    let resultado: ReturnType<typeof lerRespostaDaMeta>;
    try {
      const resposta = await enviar(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(
          montarMensagem(m.template, m.telefone, {
            nome: m.cliente_nome,
            salao: m.salao,
            servico: m.servico,
            profissional: m.profissional,
            inicio: m.inicio,
            fuso: m.fuso,
          }),
        ),
        signal: AbortSignal.timeout(10_000),
      });
      resultado = lerRespostaDaMeta(resposta.status, await resposta.json().catch(() => null));
    } catch {
      resultado = { ok: false, tentarDepois: true, erro: "sem resposta da Meta" };
    }

    const status: StatusDoEnvio = resultado.ok ? "enviada" : resultado.tentarDepois ? "na_fila" : "falhou";
    try {
      await fila.resultado(m.mensagem_id, status, resultado.ok ? { wamid: resultado.wamid } : { erro: resultado.erro });
    } catch (e) {
      // A mensagem fica em "enviando"; o lote continua.
      console.error(`whatsapp: resultado não gravado (${e instanceof Error ? e.message : "erro"}), mensagem ${m.mensagem_id}`);
    }

    if (resultado.ok) resumo.enviadas++;
    else if (resultado.tentarDepois) resumo.adiadas++;
    else {
      resumo.falhas++;
      console.error(`whatsapp: mensagem ${m.mensagem_id} falhou (${resultado.erro})`);
    }
  }
  return resumo;
}

/**
 * Vários lotes seguidos (job do pg_cron). Para quando a fila acaba (lote incompleto) ou quando a
 * Meta pediu para esperar (alguma adiada): o próximo job tenta de novo.
 */
export async function processarTudo(lotes: number, deps: DepsDoEnvio = {}): Promise<ResumoDoEnvio> {
  const total: ResumoDoEnvio = { enviadas: 0, falhas: 0, adiadas: 0 };
  // Uma fila só para todos os lotes.
  const fila = typeof deps.fila === "function" ? await deps.fila() : (deps.fila ?? (await filaWhatsApp()));
  for (let i = 0; i < lotes; i++) {
    const r = await processarFila({ ...deps, fila });
    total.enviadas += r.enviadas;
    total.falhas += r.falhas;
    total.adiadas += r.adiadas;
    if (r.enviadas + r.falhas + r.adiadas < LOTE || r.adiadas > 0) break;
  }
  return total;
}
