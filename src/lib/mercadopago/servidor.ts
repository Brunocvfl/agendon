// As dependências de verdade da cobrança: a API do Mercado Pago (MERCADOPAGO_ACCESS_TOKEN) e o banco
// pela chave secreta, restrita à função cobranca_registrar_pagamento.
import "server-only";
import { connection } from "next/server";
import { paraRpc } from "@/lib/supabase/rpc";
import { clienteSecreto } from "@/lib/supabase/secreto";
import type { ApiMercadoPago, BancoDeCobranca, PagamentoMP } from "./cobranca";

const API = "https://api.mercadopago.com";

export function apiMercadoPago(token: string): ApiMercadoPago {
  return {
    async pagamento(id) {
      if (!/^\d{1,30}$/.test(id)) return null;
      const r = await fetch(`${API}/v1/payments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`mercadopago: GET payment respondeu ${r.status}`);
      return (await r.json()) as PagamentoMP;
    },
  };
}

export async function bancoDeCobranca(): Promise<BancoDeCobranca> {
  await connection();
  const db = paraRpc<"cobranca_registrar_pagamento">(clienteSecreto());
  // Os tipos gerados não aceitam null nos parâmetros; a função do banco trata null (pacote).
  const nulo = null as unknown as string;
  return {
    async registrarPagamento(r) {
      const { data, error } = await db.rpc("cobranca_registrar_pagamento", {
        p_salon: r.salao,
        p_mp_id: r.mpId,
        p_tipo: r.tipo,
        p_plano: r.plano ?? nulo,
        p_ciclo: r.ciclo ?? nulo,
        p_valor: r.valor,
        p_status: r.status,
      });
      if (error) throw new Error(`cobranca_registrar_pagamento falhou (${error.code ?? "sem código"})`);
      return data === true;
    },
  };
}
