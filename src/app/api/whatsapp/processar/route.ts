// Envio da fila do WhatsApp, chamado pelo job do pg_cron (`app.whatsapp_tique`, pg_net) a cada 15 min,
// quando há mensagens na fila: lembretes e novas tentativas. Protegido por segredo no cabeçalho
// (WHATSAPP_PROCESSAR_SEGREDO, o mesmo do Vault). Nada de dado pessoal em log.
import { connection } from "next/server";
import { bearerValido } from "@/lib/whatsapp/assinatura";
import { processarTudo } from "@/lib/whatsapp/enviar";

const LOTES = 5; // até 50 mensagens por chamada

export async function POST(request: Request) {
  await connection();
  if (!bearerValido(request.headers.get("authorization"), process.env.WHATSAPP_PROCESSAR_SEGREDO)) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    return Response.json(await processarTudo(LOTES));
  } catch (e) {
    console.error(e instanceof Error ? e.message : "whatsapp: processar falhou");
    return new Response("Server error", { status: 500 });
  }
}
