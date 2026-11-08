import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoLink, Cartao } from "@/components/ui";
import { PaginaProtegida } from "@/components/pagina-protegida";
import type { Vinculo } from "@/lib/auth";
import { dataNoFuso, minutosNoFuso, paraHora, rotuloData } from "@/lib/datas";
import { formatarDuracao, formatarPreco, formatarTelefone, linkWhatsApp, NOME_STATUS } from "@/lib/formato";
import { pode } from "@/lib/permissoes";
import { podeRemarcar, proximosStatus, type Status } from "@/lib/regras/agendamento";
import { carregarAgendamento } from "../dados";
import { AcoesStatus } from "./acoes-status";

export const metadata: Metadata = { title: "Agendamento · AgendOn" };

export default function PaginaAgendamento({ params }: PageProps<"/painel/agenda/[id]">) {
  return (
    <div className="mx-auto max-w-2xl">
      <PaginaProtegida exige="mudar-status" senao="/painel/agenda" params={params} carregando={<div className="h-96" />}>
        {({ vinculo, id }) => <Conteudo vinculo={vinculo} id={id} />}
      </PaginaProtegida>
    </div>
  );
}

const ESTILO_STATUS: Record<Status, string> = {
  confirmado: "bg-confirmado/15 text-[#0E7A4D]",
  agendado: "bg-on/10 text-on",
  concluido: "bg-noite/8 text-noite/70",
  faltou: "bg-red-50 text-red-700",
  cancelado: "bg-noite/5 text-noite/50",
};

async function Conteudo({ vinculo, id }: { vinculo: Vinculo; id: string }) {
  const { salao, perfil } = vinculo;
  const ag = await carregarAgendamento(id);
  if (!ag) notFound();

  const dia = dataNoFuso(ag.inicio, salao.fuso);
  const de = minutosNoFuso(ag.inicio, salao.fuso);
  const duracao = Math.round((new Date(ag.fim).getTime() - new Date(ag.inicio).getTime()) / 60000);
  const comecou = new Date(ag.inicio) <= new Date();
  const acoes = proximosStatus(ag.status, comecou);
  const remarcar = podeRemarcar(ag.status) && pode(perfil, "criar-agendamento");

  return (
    <>
      <Link href={`/painel/agenda?dia=${dia}`} className="text-sm font-medium text-on hover:underline">
        ← Agenda de {rotuloData(dia)}
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold sm:text-3xl">{ag.clienteNome}</h1>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold first-letter:uppercase ${ESTILO_STATUS[ag.status]}`}>
          {NOME_STATUS[ag.status]}
        </span>
      </div>

      <Cartao className="mt-6">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Item rotulo="Quando">
            {rotuloData(dia)}, {paraHora(de)}–{paraHora(de + duracao)}
          </Item>
          <Item rotulo="Serviço">
            {ag.servico} · {formatarDuracao(duracao)}
          </Item>
          <Item rotulo="Profissional">{ag.profissional}</Item>
          <Item rotulo="Preço">{formatarPreco(ag.preco)}</Item>
          {ag.clienteTelefone ? (
            <Item rotulo="WhatsApp">
              <span className="tabular-nums">{formatarTelefone(ag.clienteTelefone)}</span>
              {" · "}
              <a
                href={linkWhatsApp(ag.clienteTelefone)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-on hover:underline"
              >
                Chamar
              </a>
            </Item>
          ) : null}
          <Item rotulo="Origem">
            {ag.origem === "publico" ? "Página pública" : "Painel"} · criado em{" "}
            {rotuloData(dataNoFuso(ag.criadoEm, salao.fuso))}
          </Item>
        </dl>
        {ag.clienteId ? (
          <p className="mt-5 border-t border-noite/8 pt-4 text-sm">
            <Link href={`/painel/clientes/${ag.clienteId}`} className="font-medium text-on hover:underline">
              Ver cliente e histórico
            </Link>
          </p>
        ) : null}
      </Cartao>

      {acoes.length > 0 || remarcar ? (
        <Cartao className="mt-4">
          <h2 className="font-semibold">Ações</h2>
          {!comecou && podeRemarcar(ag.status) ? (
            <p className="mt-1 text-sm text-noite/55">Concluir e marcar falta ficam disponíveis a partir do horário de início.</p>
          ) : null}
          <AcoesStatus id={ag.id} acoes={acoes}>
            {remarcar ? (
              <BotaoLink href={`/painel/agenda/${ag.id}/remarcar`} variante="secundario">
                Remarcar
              </BotaoLink>
            ) : null}
          </AcoesStatus>
        </Cartao>
      ) : (
        <p className="mt-4 text-sm text-noite/55">Atendimento concluído. Não há mais ações para este agendamento.</p>
      )}
    </>
  );
}

function Item({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-noite/55">{rotulo}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}
