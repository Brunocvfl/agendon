import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cartao } from "@/components/ui";
import { PaginaProtegida } from "@/components/pagina-protegida";
import type { Vinculo } from "@/lib/auth";
import { pode } from "@/lib/permissoes";
import { formatarDiaMes, formatarMesAno, formatarTelefone, iniciais, linkWhatsApp, NOME_STATUS } from "@/lib/formato";
import { buscarCliente, type Atendimento } from "../dados";
import { FormCliente } from "../form-cliente";
import { DadosDoTitular } from "./dados-do-titular";

type Datas = { diaMes: (iso: string) => string; mesAno: (iso: string) => string };

export const metadata: Metadata = { title: "Cliente · AgendOn" };

export default function PaginaCliente({ params }: PageProps<"/painel/clientes/[id]">) {
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/painel/clientes" className="text-sm font-medium text-on hover:underline">
        ← Clientes
      </Link>
      <PaginaProtegida
        exige="ver-clientes"
        senao="/painel"
        params={params}
        carregando={<p className="mt-4 text-sm text-noite/65">Carregando…</p>}
      >
        {(ctx) => <Conteudo {...ctx} />}
      </PaginaProtegida>
    </div>
  );
}

async function Conteudo({ vinculo: { salao, perfil }, id }: { vinculo: Vinculo; id: string }) {
  const cliente = await buscarCliente(salao.id, id);
  if (!cliente) notFound();

  const data = { diaMes: (iso: string) => formatarDiaMes(iso, salao.fuso), mesAno: (iso: string) => formatarMesAno(iso, salao.fuso) };

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-on/10 text-lg font-semibold text-on">
            {iniciais(cliente.nome)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold sm:text-3xl">{cliente.nome}</h1>
            <p className="text-sm text-noite/65">
              {formatarTelefone(cliente.telefone)} · cliente desde{" "}
              {data.mesAno(cliente.criadoEm)}
            </p>
          </div>
        </div>
        <a
          href={linkWhatsApp(cliente.telefone)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-confirmado-escuro px-5 text-[15px] font-semibold text-white transition-colors hover:bg-confirmado-escuro/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-confirmado-escuro"
        >
          Chamar no WhatsApp
        </a>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:max-w-sm">
        <Numero valor={cliente.visitas} rotulo={cliente.visitas === 1 ? "visita" : "visitas"} />
        <Numero valor={cliente.faltas} rotulo={cliente.faltas === 1 ? "falta" : "faltas"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Cartao>
          <h2 className="text-lg font-semibold">Dados</h2>
          <div className="mt-4">
            <FormCliente
              inicial={{
                id: cliente.id,
                nome: cliente.nome,
                telefone: formatarTelefone(cliente.telefone),
                observacoes: cliente.observacoes,
              }}
            />
          </div>
          <p className="mt-4 border-t border-noite/8 pt-4 text-sm text-noite/65">
            Lembretes por WhatsApp:{" "}
            {cliente.optIn ? "autorizados pelo cliente." : "o cliente ainda não autorizou (a autorização é dada na página de agendamento)."}
          </p>
        </Cartao>

        <Cartao>
          <h2 className="text-lg font-semibold">Histórico</h2>
          {cliente.historico.length === 0 ? (
            <p className="mt-2 text-sm text-noite/65">Nenhum agendamento ainda.</p>
          ) : (
            <ul className="mt-3">
              {cliente.historico.map((a) => (
                <ItemHistorico key={a.id} a={a} data={data} />
              ))}
            </ul>
          )}
        </Cartao>
      </div>

      {pode(perfil, "dados-do-titular") ? (
        <Cartao className="mt-6 lg:max-w-[calc(100%-23.5rem)]">
          <h2 className="text-lg font-semibold">Dados pessoais (LGPD)</h2>
          <p className="mt-1 text-sm text-noite/65">
            O salão é o controlador dos dados dos clientes. Use estas opções quando o cliente pedir.
          </p>
          <div className="mt-4">
            <DadosDoTitular id={cliente.id} futuros={cliente.futuros} />
          </div>
        </Cartao>
      ) : null}
    </>
  );
}

function Numero({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-noite/5">
      <p className="text-2xl font-semibold tabular-nums">{valor}</p>
      <p className="text-sm text-noite/65">{rotulo}</p>
    </div>
  );
}

function ItemHistorico({ a, data }: { a: Atendimento; data: Datas }) {
  const corStatus =
    a.status === "faltou" ? "text-red-600" : a.status === "cancelado" ? "text-noite/65" : "text-noite/65";
  return (
    <li className="grid grid-cols-[4rem_1fr] gap-3 border-b border-noite/8 py-3 text-sm last:border-b-0">
      <span className="text-noite/65">{data.diaMes(a.inicio)}</span>
      <div className="min-w-0">
        <p className="font-medium">{a.servico}</p>
        <p className={corStatus}>
          {a.profissional} · {NOME_STATUS[a.status]}
        </p>
      </div>
    </li>
  );
}
