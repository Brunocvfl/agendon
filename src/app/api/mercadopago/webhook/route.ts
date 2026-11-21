// Webhook do Mercado Pago. Valida a assinatura (x-signature), busca o pagamento na API do MP e registra
// de forma idempotente. 200 para o que foi tratado ou não interessa; 500 faz o MP tentar de novo.
// Nada de dado pessoal em log.
import { connection } from "next/server";
import { assinaturaValida } from "@/lib/mercadopago/assinatura";
import { aplicarNotificacao } from "@/lib/mercadopago/cobranca";
import { apiMercadoPago, bancoDeCobranca } from "@/lib/mercadopago/servidor";

const LIMITE_DO_CORPO = 100_000;

export async function POST(request: Request) {
  await connection();
  const segredo = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!segredo || !token) {
    console.error("mercadopago: falta MERCADOPAGO_WEBHOOK_SECRET ou MERCADOPAGO_ACCESS_TOKEN; aviso recusado.");
    return new Response("Server error", { status: 500 });
  }

  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id");
  const assinatura = { cabecalho: request.headers.get("x-signature"), requestId: request.headers.get("x-request-id"), dataId };
  if (!assinaturaValida(assinatura, segredo)) return new Response("Invalid signature", { status: 401 });

  const corpo = await request.text();
  if (corpo.length > LIMITE_DO_CORPO) return new Response("Payload too large", { status: 413 });
  let tipo = url.searchParams.get("type");
  if (!tipo) {
    try {
      tipo = (JSON.parse(corpo) as { type?: string }).type ?? null;
    } catch {
      tipo = null;
    }
  }
  if (!tipo || !dataId) return new Response("ok", { status: 200 });

  try {
    const r = await aplicarNotificacao({ tipo, id: dataId }, { mp: apiMercadoPago(token), banco: await bancoDeCobranca() });
    if (!r.ok && r.motivo !== "tipo_ignorado") console.warn(`mercadopago: aviso ignorado (${r.motivo})`);
  } catch (e) {
    console.error(e instanceof Error ? e.message : "mercadopago: webhook falhou");
    return new Response("Server error", { status: 500 });
  }
  return new Response("ok", { status: 200 });
}
