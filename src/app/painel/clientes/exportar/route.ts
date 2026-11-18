// Baixa a lista de clientes em CSV (todas as colunas), com a busca e o filtro de WhatsApp da tela.
// Só Dono(a) (permissão "dados-do-titular": o salão é o controlador); o banco confere de novo e
// registra cada exportação na auditoria.
import { getVinculo } from "@/lib/auth";
import { paraCsv } from "@/lib/csv";
import { dataNoFuso, formatarData, horaNoFuso } from "@/lib/datas";
import { formatarTelefone } from "@/lib/formato";
import { pode } from "@/lib/permissoes";
import { arquivoDaLista, lerFiltroWhatsApp } from "@/lib/regras/cliente";
import { createClient } from "@/lib/supabase/server";

const CABECALHO = [
  "Nome",
  "WhatsApp",
  "Observações",
  "Cliente desde",
  "Último atendimento",
  "Próximo agendamento",
  "Visitas",
  "Faltas",
  "Cancelamentos",
  "Total gasto (R$)",
  "WhatsApp autorizado em",
  "Origem da autorização",
  "Saiu do WhatsApp em",
];

const ORIGEM: Record<string, string> = { pagina_publica: "Página pública" };

export async function GET(request: Request) {
  const vinculo = await getVinculo();
  if (!vinculo || !pode(vinculo.perfil, "dados-do-titular")) return new Response("Não encontrado.", { status: 404 });

  const url = new URL(request.url);
  const busca = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const whatsapp = lerFiltroWhatsApp(url.searchParams.get("whatsapp") ?? undefined);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("exportar_clientes", {
    p_salon: vinculo.salao.id,
    p_busca: busca,
    p_whatsapp: whatsapp,
  });
  if (error || !data) throw new Error("Falha ao exportar os clientes.");

  const { fuso } = vinculo.salao;
  const dataHora = (iso: string | null) => (iso ? `${formatarData(iso, fuso)} ${horaNoFuso(iso, fuso)}` : "");
  const dinheiro = (n: number) => Number(n).toFixed(2).replace(".", ",");

  const csv = paraCsv(
    CABECALHO,
    data.map((c) => [
      c.nome,
      c.telefone ? formatarTelefone(c.telefone) : "",
      c.observacoes,
      c.cadastrado_em ? formatarData(c.cadastrado_em, fuso) : "",
      dataHora(c.ultimo_atendimento),
      dataHora(c.proximo_agendamento),
      c.visitas,
      c.faltas,
      c.cancelamentos,
      dinheiro(c.total_gasto),
      dataHora(c.consentimento_whatsapp_em),
      c.consentimento_origem ? (ORIGEM[c.consentimento_origem] ?? c.consentimento_origem) : "",
      dataHora(c.optout_em),
    ]),
  );

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${arquivoDaLista(dataNoFuso(new Date(), fuso))}"`,
      "cache-control": "no-store",
    },
  });
}
