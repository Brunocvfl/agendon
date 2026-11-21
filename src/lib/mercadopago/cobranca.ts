// Cobrança: o que fazer com um aviso do Mercado Pago. Busca o pagamento na API do MP (o corpo do aviso
// não é confiável), confere que a referência é nossa e que o valor é o do catálogo, e registra no banco
// (idempotente: o mesmo pagamento aprovado só vale uma vez). As dependências são injetadas: as de
// verdade ficam em servidor.ts; os testes usam versões falsas.
import { PACOTE_EXTRA, precoDoCiclo } from "@/lib/regras/plano";
import { lerReferencia, type Compra } from "./referencia";

/** O que nos interessa de um pagamento do MP (GET /v1/payments/{id}). */
export type PagamentoMP = {
  id: string | number;
  status: string;
  transaction_amount: number;
  currency_id: string;
  external_reference: string | null;
};

export interface ApiMercadoPago {
  /** O pagamento, ou null se o MP não o conhece (404). Lança erro em falha temporária. */
  pagamento(id: string): Promise<PagamentoMP | null>;
}

export type RegistroDePagamento = {
  salao: string;
  mpId: string;
  tipo: Compra["tipo"];
  plano: string | null;
  ciclo: string | null;
  valor: number;
  status: string;
};

export interface BancoDeCobranca {
  /** cobranca_registrar_pagamento: true se aplicou o pagamento agora. */
  registrarPagamento(r: RegistroDePagamento): Promise<boolean>;
}

export type Notificacao = { tipo: string; id: string };

export type ResultadoDoAviso =
  | { ok: true; aplicado: boolean }
  | { ok: false; motivo: "tipo_ignorado" | "nao_encontrado" | "referencia_invalida" | "valor_divergente" };

export function valorEsperado(c: Compra): number {
  return c.tipo === "pacote" ? PACOTE_EXTRA.preco : precoDoCiclo(c.plano, c.ciclo);
}

export async function aplicarNotificacao(
  n: Notificacao,
  deps: { mp: ApiMercadoPago; banco: BancoDeCobranca },
): Promise<ResultadoDoAviso> {
  if (n.tipo !== "payment") return { ok: false, motivo: "tipo_ignorado" };

  const p = await deps.mp.pagamento(n.id);
  if (!p) return { ok: false, motivo: "nao_encontrado" };

  const compra = lerReferencia(p.external_reference);
  if (!compra) return { ok: false, motivo: "referencia_invalida" };
  if (p.currency_id !== "BRL" || Math.abs(p.transaction_amount - valorEsperado(compra)) > 0.005) {
    return { ok: false, motivo: "valor_divergente" };
  }

  const aplicado = await deps.banco.registrarPagamento({
    salao: compra.salao,
    mpId: String(p.id),
    tipo: compra.tipo,
    plano: compra.tipo === "pacote" ? null : compra.plano,
    ciclo: compra.tipo === "pacote" ? null : compra.ciclo,
    valor: p.transaction_amount,
    status: p.status,
  });
  return { ok: true, aplicado };
}
