// Webhook do WhatsApp (Meta). Duas coisas: verificação do endereço (GET) e eventos (POST).
// Regras: validar a assinatura antes de ler o corpo, responder rápido e processar de forma idempotente
// (status nunca volta para trás; SAIR repetido não muda nada). Nada de dado pessoal em log.
import { connection } from "next/server";
import { clienteWhatsApp } from "@/lib/supabase/whatsapp";
import { assinaturaValida, textosIguais } from "@/lib/whatsapp/assinatura";
import { lerEventos } from "@/lib/whatsapp/eventos";

const LIMITE_DO_CORPO = 1_000_000; // 1 MB

// A Meta chama este endereço ao cadastrar o webhook: devolve o desafio se o token confere.
export async function GET(request: Request) {
  await connection();
  const parametros = new URL(request.url).searchParams;
  const token = process.env.META_WEBHOOK_VERIFY_TOKEN;
  const desafio = parametros.get("hub.challenge");

  if (token && desafio && parametros.get("hub.mode") === "subscribe" && textosIguais(parametros.get("hub.verify_token") ?? "", token)) {
    return new Response(desafio, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const segredo = process.env.META_APP_SECRET;
  if (!segredo) {
    console.error("whatsapp: falta META_APP_SECRET; webhook recusado.");
    return new Response("Server error", { status: 500 });
  }

  const corpo = Buffer.from(await request.arrayBuffer());
  if (corpo.length > LIMITE_DO_CORPO) return new Response("Payload too large", { status: 413 });
  if (!assinaturaValida(corpo, request.headers.get("x-hub-signature-256"), segredo)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(corpo.toString("utf8"));
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const eventos = lerEventos(json);
  if (eventos.statuses.length === 0 && eventos.saidas.length === 0) return new Response("ok", { status: 200 });

  const supabase = await clienteWhatsApp();
  try {
    for (const s of eventos.statuses) {
      const { error } = await supabase.rpc("whatsapp_status_meta", {
        p_wamid: s.wamid,
        p_status: s.status,
        p_erro: s.erro as string,
      });
      if (error) throw new Error(`whatsapp_status_meta falhou (${error.code})`);
    }
    for (const telefones of eventos.saidas) {
      const { error } = await supabase.rpc("whatsapp_optout", { p_telefones: telefones });
      if (error) throw new Error(`whatsapp_optout falhou (${error.code})`);
    }
  } catch (e) {
    // 500 faz a Meta tentar de novo mais tarde; as funções são idempotentes.
    console.error(e instanceof Error ? e.message : "whatsapp: webhook falhou");
    return new Response("Server error", { status: 500 });
  }
  return new Response("ok", { status: 200 });
}
