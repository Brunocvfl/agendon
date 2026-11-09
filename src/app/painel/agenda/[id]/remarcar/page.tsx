import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cartao } from "@/components/ui";
import { PaginaProtegida } from "@/components/pagina-protegida";
import type { Vinculo } from "@/lib/auth";
import { dataNoFuso, minutosNoFuso, paraHora, rotuloData } from "@/lib/datas";
import { formatarPreco, NOME_STATUS } from "@/lib/formato";
import { podeRemarcar } from "@/lib/regras/agendamento";
import { carregarAgendamento, profissionaisParaRemarcar } from "../../dados";
import { FormRemarcar } from "./form-remarcar";

export const metadata: Metadata = { title: "Remarcar · AgendOn" };

export default function PaginaRemarcar({ params }: PageProps<"/painel/agenda/[id]/remarcar">) {
  return (
    <div className="mx-auto max-w-2xl">
      <PaginaProtegida exige="criar-agendamento" senao="/painel/agenda" params={params} carregando={<div className="h-96" />}>
        {({ vinculo, id }) => <Conteudo vinculo={vinculo} id={id} />}
      </PaginaProtegida>
    </div>
  );
}

async function Conteudo({ vinculo, id }: { vinculo: Vinculo; id: string }) {
  const { fuso } = vinculo.salao;
  const ag = await carregarAgendamento(id);
  if (!ag) notFound();

  const dia = dataNoFuso(ag.inicio, fuso);
  const hora = paraHora(minutosNoFuso(ag.inicio, fuso));

  return (
    <>
      <Link href={`/painel/agenda/${ag.id}`} className="text-sm font-medium text-on hover:underline">
        ← Agendamento
      </Link>
      <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">Remarcar</h1>
      <p className="mt-2 text-noite/65">
        {ag.clienteNome} · {ag.servico} · {formatarPreco(ag.preco)}
        <br />
        Hoje: {rotuloData(dia)}, {hora}, com {ag.profissional}
      </p>
      <Cartao className="mt-6">
        {podeRemarcar(ag.status) ? (
          <FormRemarcar
            id={ag.id}
            servico={ag.servicoId}
            profissionais={await profissionaisParaRemarcar(vinculo, ag)}
            inicial={{ profissional: ag.profissionalId, dia, hora }}
          />
        ) : (
          <p className="text-sm text-noite/65">
            Este agendamento está {NOME_STATUS[ag.status]} e não pode ser remarcado.
          </p>
        )}
      </Cartao>
    </>
  );
}
