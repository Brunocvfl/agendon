"use server";

import { exigirVinculo } from "@/lib/auth";
import { lerEndereco, lerInscricao } from "@/lib/regras/push";
import { createClient } from "@/lib/supabase/server";

// Avisos da equipe: todo membro ativo recebe os da agenda que pode ver (o banco decide quem).
// Por isso não há permissão da matriz aqui: basta o vínculo.

export type ResultadoAviso = { erro?: string };

const NAO_LIGOU = "Não foi possível ligar os avisos agora. Tente de novo.";

/** Liga os avisos neste aparelho (inscrição de Web Push vinda do navegador). */
export async function ligarAvisos(dado: unknown): Promise<ResultadoAviso> {
  await exigirVinculo();
  const inscricao = lerInscricao(dado);
  if (!inscricao) return { erro: NAO_LIGOU };
  const supabase = await createClient();
  const { error } = await supabase.rpc("salvar_inscricao_push", {
    p_endpoint: inscricao.endpoint,
    p_p256dh: inscricao.p256dh,
    p_auth: inscricao.auth,
  });
  if (error) {
    console.error(`push: inscrição não gravada (${error.code ?? "sem código"})`);
    return { erro: NAO_LIGOU };
  }
  return {};
}

/** Desliga os avisos neste aparelho. */
export async function desligarAvisos(endpoint: unknown): Promise<ResultadoAviso> {
  await exigirVinculo();
  const url = lerEndereco(endpoint);
  if (!url) return {};
  const supabase = await createClient();
  const { error } = await supabase.rpc("remover_inscricao_push", { p_endpoint: url });
  return error ? { erro: "Não foi possível desligar os avisos agora. Tente de novo." } : {};
}

/**
 * Abriu a lista: tudo vira lido. Sem refresh, para a lista aberta continuar mostrando o que era novo;
 * o sininho some sozinho nesta página e zera na próxima navegação.
 */
export async function marcarLidas(): Promise<void> {
  await exigirVinculo();
  const supabase = await createClient();
  const { error } = await supabase.rpc("marcar_notificacoes_lidas");
  if (error) console.error(`notificacoes: marcar como lidas falhou (${error.code ?? "sem código"})`);
}
