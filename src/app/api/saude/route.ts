// Verificação de saúde do servidor (deploy na VPS e monitor de site fora do ar). Responde na hora,
// sem acessar o banco: diz só que o processo do Next está de pé. Não expõe versão nem ambiente.
import { connection } from "next/server";

export async function GET() {
  await connection();
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
