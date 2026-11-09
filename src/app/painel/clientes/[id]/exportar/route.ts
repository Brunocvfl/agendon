// LGPD: baixa os dados de um cliente (cadastro, consentimento e histórico) em JSON.
// Só Dono(a) (permissão "dados-do-titular"); o banco confere de novo e registra na auditoria.
import { getVinculo } from "@/lib/auth";
import { dataNoFuso } from "@/lib/datas";
import { ehUuid } from "@/lib/ids";
import { pode } from "@/lib/permissoes";
import { arquivoDaExportacao } from "@/lib/regras/cliente";
import { createClient } from "@/lib/supabase/server";

const NAO_ENCONTRADO = () => new Response("Não encontrado.", { status: 404 });

export async function GET(_request: Request, ctx: RouteContext<"/painel/clientes/[id]/exportar">) {
  const { id } = await ctx.params;
  const vinculo = await getVinculo();
  if (!vinculo || !pode(vinculo.perfil, "dados-do-titular") || !ehUuid(id)) return NAO_ENCONTRADO();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("exportar_cliente", { p_client: id });
  if (error || !data) return NAO_ENCONTRADO();

  const nome = (data as { cliente?: { nome?: string } }).cliente?.nome ?? "";
  const arquivo = arquivoDaExportacao(nome, dataNoFuso(new Date(), vinculo.salao.fuso));

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${arquivo}"`,
      "cache-control": "no-store",
    },
  });
}
