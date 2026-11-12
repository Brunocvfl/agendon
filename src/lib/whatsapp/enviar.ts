// Envio das mensagens da fila pela Cloud API da Meta. Chamado depois de um agendamento (after()).
// Só a fila fala com o banco, por funções próprias; telefone e nome do cliente existem aqui só na
// memória, durante o envio, e nunca vão para log.
import "server-only";
import { clienteWhatsApp } from "@/lib/supabase/whatsapp";
import { lerRespostaDaMeta } from "./graph";
import { montarConfirmacao } from "./template";

const LOTE = 10;
const VERSAO_PADRAO = "v23.0";

export type ResumoDoEnvio = { enviadas: number; falhas: number; adiadas: number };

export async function processarFila(): Promise<ResumoDoEnvio> {
  const resumo: ResumoDoEnvio = { enviadas: 0, falhas: 0, adiadas: 0 };
  const token = process.env.META_ACCESS_TOKEN;
  const numeroId = process.env.META_PHONE_NUMBER_ID;
  if (!token || !numeroId) {
    // Sem credenciais (ex.: ambiente local): a fila fica como está.
    console.warn("whatsapp: faltam META_ACCESS_TOKEN e/ou META_PHONE_NUMBER_ID; fila não processada.");
    return resumo;
  }
  const url = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || VERSAO_PADRAO}/${numeroId}/messages`;

  const supabase = await clienteWhatsApp();
  const { data: mensagens, error } = await supabase.rpc("whatsapp_reservar", { p_limite: LOTE });
  if (error) throw new Error(`whatsapp_reservar falhou (${error.code})`);

  for (const m of mensagens ?? []) {
    let resultado: ReturnType<typeof lerRespostaDaMeta>;
    try {
      const resposta = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(
          montarConfirmacao(m.template, m.telefone, {
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

    const status = resultado.ok ? "enviada" : resultado.tentarDepois ? "na_fila" : "falhou";
    const { error: erroResultado } = await supabase.rpc("whatsapp_resultado", {
      p_id: m.mensagem_id,
      p_status: status,
      p_wamid: resultado.ok ? resultado.wamid : (null as unknown as string),
      p_erro: resultado.ok ? (null as unknown as string) : resultado.erro,
    });
    if (erroResultado) console.error(`whatsapp: resultado não gravado (${erroResultado.code}), mensagem ${m.mensagem_id}`);

    if (resultado.ok) resumo.enviadas++;
    else if (resultado.tentarDepois) resumo.adiadas++;
    else {
      resumo.falhas++;
      console.error(`whatsapp: mensagem ${m.mensagem_id} falhou (${resultado.erro})`);
    }
  }
  return resumo;
}
