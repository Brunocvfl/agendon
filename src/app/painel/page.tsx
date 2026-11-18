import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Cartao } from "@/components/ui";
import { PaginaProtegida } from "@/components/pagina-protegida";
import type { Vinculo } from "@/lib/auth";
import { valoresDaAgenda } from "@/lib/agenda";
import { dataNoFuso, horaNoFuso, rotuloData } from "@/lib/datas";
import { formatarPreco, iniciais, NOME_STATUS } from "@/lib/formato";
import { SITE } from "@/lib/legal";
import { urlDaLogo } from "@/lib/logo";
import { NOME_PERFIL, pode } from "@/lib/permissoes";
import { createClient } from "@/lib/supabase/server";
import { carregarAgenda, type ItemAgenda } from "./agenda/dados";
import { CopiarLink } from "./copiar-link";

export const metadata: Metadata = { title: "Painel · AgendOn" };

export default function PaginaPainel() {
  return <PaginaProtegida>{({ vinculo }) => <Inicio vinculo={vinculo} />}</PaginaProtegida>;
}

/** Quanto da configuração inicial já foi feito (contagens leves, sem trazer linhas) e a logo. */
async function progresso(salonId: string) {
  const supabase = await createClient();
  const contar = async (tabela: "services" | "professionals" | "working_hours") => {
    const { count } = await supabase.from(tabela).select("*", { count: "exact", head: true }).eq("salon_id", salonId);
    return count ?? 0;
  };
  const [servicos, profissionais, horarios, publicos, salao] = await Promise.all([
    contar("services"),
    contar("professionals"),
    contar("working_hours"),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("salon_id", salonId)
      .eq("origem", "publico")
      .then((r) => r.count ?? 0),
    supabase.from("salons").select("logo_path").eq("id", salonId).maybeSingle(),
  ]);
  return { servicos, profissionais, horarios, publicos, logoPath: salao.data?.logo_path ?? null };
}

async function Inicio({ vinculo }: { vinculo: Vinculo }) {
  const { salao, perfil } = vinculo;
  const hoje = dataNoFuso(new Date(), salao.fuso);
  const [p, agenda] = await Promise.all([progresso(salao.id), carregarAgenda(vinculo, [hoje])]);
  const dono = pode(perfil, "editar-servicos");

  const passos = [
    {
      titulo: "Cadastre os serviços",
      texto: "Nome, duração e preço do que o salão oferece.",
      feito: p.servicos > 0,
      href: dono ? (p.servicos > 0 ? "/painel/servicos" : "/painel/servicos/novo") : "/painel/servicos",
    },
    {
      titulo: "Cadastre quem atende",
      texto: "Cada profissional e os serviços que faz. Se você atende, cadastre-se também.",
      feito: p.profissionais > 0,
      href: dono && p.profissionais === 0 ? "/painel/profissionais/novo" : "/painel/profissionais",
    },
    {
      titulo: "Defina os horários de trabalho",
      texto: "Dias, horários e pausas de cada profissional.",
      feito: p.horarios > 0,
      href: "/painel/profissionais",
    },
    {
      titulo: "Divulgue seu link",
      texto: "Compartilhe a página no Instagram e no WhatsApp. Fica feito com o primeiro agendamento por ela.",
      feito: p.publicos > 0,
      href: `/${salao.slug}`,
    },
  ];
  const feitos = passos.filter((x) => x.feito).length;

  // Hoje: um agendamento que passa da meia-noite aparece uma vez só.
  const itens = [...new Map(agenda.colunas.flatMap((c) => c.itens).map((i) => [i.id, i])).values()];
  const profissionalDe = new Map(agenda.colunas.map((c) => [c.profissionalId, c.nome]));
  const ativos = itens.filter((i) => i.status !== "cancelado");
  const agora = new Date();
  const proximos = ativos
    .filter((i) => (i.status === "agendado" || i.status === "confirmado") && new Date(i.fim) > agora)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const valores = pode(perfil, "ver-valores") ? valoresDaAgenda(itens) : null;
  const linkPublico = `${SITE}/${salao.slug}`;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-4">
        {p.logoPath ? (
          <Image
            src={urlDaLogo(p.logoPath)}
            alt=""
            aria-hidden
            width={56}
            height={56}
            unoptimized
            className="size-14 shrink-0 rounded-2xl object-cover ring-1 ring-noite/10"
          />
        ) : (
          <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-on text-lg font-semibold text-white">
            {iniciais(salao.nome)}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm text-noite/65">{NOME_PERFIL[perfil]}</p>
          <h1 className="break-words text-2xl font-semibold sm:text-3xl">{salao.nome}</h1>
        </div>
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-noite/65">
        <span className="break-all">
          Página de agendamento: <span className="font-medium text-noite">{linkPublico}</span>
        </span>
        <CopiarLink url={`https://${linkPublico}`} />
        <Link href={`/${salao.slug}`} target="_blank" className="font-medium text-on hover:underline">
          Abrir
        </Link>
      </p>

      {feitos < passos.length ? <Checklist passos={passos} feitos={feitos} /> : null}

      <Cartao className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">
            Hoje <span className="font-normal capitalize text-noite/65">· {rotuloData(hoje)}</span>
          </h2>
          <Link href="/painel/agenda" className="text-sm font-medium text-on hover:underline">
            Abrir a agenda →
          </Link>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-3">
          <Numero rotulo={ativos.length === 1 ? "agendamento" : "agendamentos"} valor={String(ativos.length)} />
          <Numero rotulo="confirmados" valor={String(ativos.filter((i) => i.status === "confirmado").length)} />
          <Numero rotulo="aguardando" valor={String(ativos.filter((i) => i.status === "agendado").length)} />
          {valores ? (
            <>
              <Numero rotulo="previsto hoje" valor={formatarPreco(valores.previsto)} />
              <Numero rotulo="confirmado" valor={formatarPreco(valores.confirmado)} />
              <Numero rotulo="perdido com faltas" valor={formatarPreco(valores.faltas)} alerta={valores.faltas > 0} />
            </>
          ) : null}
        </dl>

        <h3 className="mt-6 text-sm font-semibold text-noite/80">Próximos</h3>
        {proximos.length === 0 ? (
          <p className="mt-2 text-sm text-noite/65">
            {ativos.length === 0 ? "Nenhum agendamento para hoje." : "Os agendamentos de hoje já terminaram."}
          </p>
        ) : (
          <ul className="mt-2 flex flex-col">
            {proximos.slice(0, 8).map((i) => (
              <Proximo key={i.id} item={i} profissional={profissionalDe.get(i.profissionalId) ?? ""} fuso={salao.fuso} />
            ))}
          </ul>
        )}
        {proximos.length > 8 ? (
          <p className="mt-2 text-sm text-noite/65">
            E mais {proximos.length - 8}.{" "}
            <Link href="/painel/agenda" className="font-medium text-on hover:underline">
              Ver todos na agenda
            </Link>
          </p>
        ) : null}
      </Cartao>
    </div>
  );
}

function Numero({ rotulo, valor, alerta = false }: { rotulo: string; valor: string; alerta?: boolean }) {
  return (
    <div className="flex flex-col-reverse rounded-xl bg-fundo px-3 py-2.5">
      <dt className="text-xs text-noite/65 sm:text-sm">{rotulo}</dt>
      <dd className={`text-lg font-semibold tabular-nums sm:text-xl ${alerta ? "text-red-600" : ""}`}>{valor}</dd>
    </div>
  );
}

function Proximo({ item, profissional, fuso }: { item: ItemAgenda; profissional: string; fuso: string }) {
  const confirmado = item.status === "confirmado";
  return (
    <li className="border-b border-noite/8 last:border-b-0">
      <Link href={`/painel/agenda/${item.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-fundo">
        <span className="w-12 shrink-0 font-semibold tabular-nums">{horaNoFuso(item.inicio, fuso)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{item.nome}</span>
          <span className="block truncate text-sm text-noite/65">
            {item.servico}
            {profissional ? ` · ${profissional}` : ""}
          </span>
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold first-letter:uppercase ${
            confirmado ? "bg-confirmado/15 text-confirmado-escuro" : "bg-on/10 text-on"
          }`}
        >
          {NOME_STATUS[item.status]}
        </span>
      </Link>
    </li>
  );
}

type Passo = { titulo: string; texto: string; feito: boolean; href: string | null };

function Checklist({ passos, feitos }: { passos: Passo[]; feitos: number }) {
  return (
    <Cartao className="mt-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">Deixe o salão pronto para agendar</h2>
        <span className="shrink-0 text-sm tabular-nums text-noite/65">
          {feitos} de {passos.length}
        </span>
      </div>
      <div aria-hidden className="mt-3 h-1.5 overflow-hidden rounded-full bg-noite/[0.06]">
        <div className="h-full rounded-full bg-confirmado" style={{ width: `${(feitos / passos.length) * 100}%` }} />
      </div>

      <ol className="mt-6 flex flex-col gap-2">
        {passos.map((passo, i) => {
          const conteudo = (
            <>
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  passo.feito ? "bg-confirmado text-white" : "bg-on/10 text-on"
                }`}
              >
                {passo.feito ? (
                  <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className="min-w-0">
                <span className={`block font-medium ${passo.feito ? "text-noite/65 line-through decoration-noite/30" : ""}`}>
                  {passo.titulo}
                  <span className="sr-only">{passo.feito ? " (feito)" : ""}</span>
                </span>
                <span className="block text-sm text-noite/65">{passo.texto}</span>
              </span>
            </>
          );
          return (
            <li key={passo.titulo}>
              {passo.href ? (
                <Link
                  href={passo.href}
                  className="flex gap-3 rounded-xl p-3 transition-colors hover:bg-fundo focus-visible:outline-2 focus-visible:outline-on"
                >
                  {conteudo}
                </Link>
              ) : (
                <div className="flex gap-3 p-3 opacity-70">{conteudo}</div>
              )}
            </li>
          );
        })}
      </ol>
    </Cartao>
  );
}
