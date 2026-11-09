import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import type { CSSProperties } from "react";
import { BotaoLink, Cartao } from "@/components/ui";
import { PaginaProtegida } from "@/components/pagina-protegida";
import type { Vinculo } from "@/lib/auth";
import { ladoALado, regua, semAtendimento, type Periodo } from "@/lib/agenda";
import {
  dataNoFuso,
  ehData,
  inicioDaSemana,
  minutosNoFuso,
  paraHora,
  rotuloData,
  rotuloSemana,
  somarDias,
} from "@/lib/datas";
import { formatarPreco, iniciais, NOME_STATUS } from "@/lib/formato";
import { pode } from "@/lib/permissoes";
import { carregarAgenda, type ColunaAgenda, type ItemAgenda, type Status } from "./dados";
import { FiltroProfissional } from "./filtro-profissional";

export const metadata: Metadata = { title: "Agenda · AgendOn" };

type Busca = Promise<Record<string, string | string[] | undefined>>;
type Vista = "dia" | "semana";

const PX_POR_MIN = 1.6; // 1 h = 96 px
const PASSO_NOVO = 30; // atalhos de "novo agendamento" na grade, de 30 em 30 min

export default function PaginaAgenda({ searchParams }: PageProps<"/painel/agenda">) {
  return (
    <div className="mx-auto max-w-7xl">
      <PaginaProtegida carregando={<h1 className="text-2xl font-semibold sm:text-3xl">Agenda</h1>}>
        {({ vinculo }) => <Conteudo vinculo={vinculo} searchParams={searchParams} />}
      </PaginaProtegida>
    </div>
  );
}

const umValor = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** URL da agenda; omite o que é padrão (vista dia, hoje, todos os profissionais). */
function hrefAgenda(o: { vista: Vista; dia?: string; profissional?: string }): string {
  const q = new URLSearchParams();
  if (o.vista === "semana") q.set("vista", "semana");
  if (o.dia) q.set("dia", o.dia);
  if (o.profissional) q.set("profissional", o.profissional);
  const s = q.toString();
  return s ? `/painel/agenda?${s}` : "/painel/agenda";
}

async function Conteudo({ vinculo, searchParams }: { vinculo: Vinculo; searchParams: Busca }) {
  const { salao, perfil } = vinculo;
  const sp = await searchParams;
  const hoje = dataNoFuso(new Date(), salao.fuso);
  const pedido = umValor(sp.dia);
  const dia = ehData(pedido) ? pedido : hoje;
  const vista: Vista = umValor(sp.vista) === "semana" ? "semana" : "dia";
  const segunda = inicioDaSemana(dia);
  const dias = vista === "semana" ? Array.from({ length: 7 }, (_, i) => somarDias(segunda, i)) : [dia];
  // Profissional agenda só na própria agenda, que é a única coluna que ele vê.
  const podeAgendar = pode(perfil, "criar-agendamento");

  const { profissionais, colunas: todas } = await carregarAgenda(vinculo, dias);
  // Dia: filtro opcional (vazio = todos). Semana: sempre um profissional (o primeiro, se nenhum for pedido).
  const pedidoProf = profissionais.find((p) => p.id === umValor(sp.profissional))?.id ?? "";
  const profissional = vista === "semana" ? pedidoProf || profissionais[0]?.id || "" : pedidoProf;
  const colunas = profissional ? todas.filter((c) => c.profissionalId === profissional) : todas;

  // Um agendamento que passa da meia-noite aparece em dois dias: conta uma vez.
  const unicos = [...new Map(colunas.flatMap((c) => c.itens).map((i) => [i.id, i])).values()];
  const ativos = unicos.filter((i) => i.status !== "cancelado");
  const previsto = ativos.filter((i) => i.status !== "faltou").reduce((s, i) => s + i.preco, 0);
  const r = regua(colunas.flatMap((c) => [...c.faixas, ...c.itens.map((i) => i.periodo)]));
  const agora = dias.includes(hoje) ? minutosNoFuso(new Date(), salao.fuso) : null;

  const semana = vista === "semana";
  const passo = semana ? 7 : 1;
  const ehAtual = semana ? segunda === inicioDaSemana(hoje) : dia === hoje;
  const rotuloPeriodo = semana
    ? `${ehAtual ? "Esta semana · " : ""}${rotuloSemana(segunda)}`
    : `${ehAtual ? "Hoje · " : ""}${rotuloData(dia)}`;
  const opcoesFiltro = [
    ...(semana ? [] : [{ valor: "", rotulo: "Todos os profissionais", href: hrefAgenda({ vista, dia }) }]),
    ...profissionais.map((p) => ({ valor: p.id, rotulo: p.nome, href: hrefAgenda({ vista, dia, profissional: p.id }) })),
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-2 text-2xl font-semibold sm:text-3xl">Agenda</h1>
        <nav aria-label={semana ? "Semana" : "Dia"} className="flex items-center gap-2">
          <Link
            href={hrefAgenda({ vista, dia: somarDias(dia, -passo), profissional })}
            aria-label={semana ? "Semana anterior" : "Dia anterior"}
            className={BOTAO_DIA}
          >
            ‹
          </Link>
          <Link
            href={hrefAgenda({ vista, profissional })}
            className={`h-10 whitespace-nowrap rounded-xl px-4 text-sm font-semibold leading-10 ${ehAtual ? "bg-noite text-white" : "border border-noite/12 bg-white hover:border-on/50"}`}
          >
            {rotuloPeriodo}
          </Link>
          <Link
            href={hrefAgenda({ vista, dia: somarDias(dia, passo), profissional })}
            aria-label={semana ? "Próxima semana" : "Próximo dia"}
            className={BOTAO_DIA}
          >
            ›
          </Link>
        </nav>
        <nav aria-label="Visualização" className="flex rounded-xl border border-noite/12 bg-white p-0.5">
          {(["dia", "semana"] as const).map((v) => (
            <Link
              key={v}
              href={hrefAgenda({ vista: v, dia, profissional })}
              aria-current={vista === v ? "page" : undefined}
              className={`h-9 rounded-[10px] px-3.5 text-sm font-medium leading-9 ${vista === v ? "bg-on/10 text-on" : "text-noite/70 hover:text-noite"}`}
            >
              {v === "dia" ? "Dia" : "Semana"}
            </Link>
          ))}
        </nav>
        <Form action="/painel/agenda" className="flex items-center gap-2">
          {semana ? <input type="hidden" name="vista" value="semana" /> : null}
          {profissional ? <input type="hidden" name="profissional" value={profissional} /> : null}
          <label htmlFor="dia" className="sr-only">
            Ir para o dia
          </label>
          <input
            id="dia"
            name="dia"
            type="date"
            defaultValue={dia}
            key={dia}
            className="h-10 rounded-xl border border-noite/12 bg-white px-3 text-sm text-noite outline-none focus:border-on focus:ring-2 focus:ring-on/20"
          />
          <button type="submit" aria-label="Ir para o dia escolhido" className="h-10 rounded-xl px-3 text-sm font-medium text-on hover:underline">
            Ir
          </button>
        </Form>
        <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
          {profissionais.length > 1 ? <FiltroProfissional opcoes={opcoesFiltro} valor={profissional} /> : null}
          {podeAgendar ? (
            <BotaoLink href={`/painel/agenda/novo?dia=${dia}${profissional ? `&profissional=${profissional}` : ""}`}>
              + Novo agendamento
            </BotaoLink>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Resumo valor={String(ativos.length)} rotulo={ativos.length === 1 ? "agendamento" : "agendamentos"} />
        <Resumo valor={String(ativos.filter((i) => i.status === "confirmado").length)} rotulo="confirmados" />
        <Resumo valor={String(ativos.filter((i) => i.status === "agendado").length)} rotulo="aguardando confirmação" />
        <Resumo valor={formatarPreco(previsto)} rotulo={semana ? "previsto na semana" : "previsto no dia"} />
      </div>

      <Legenda />

      {colunas.length === 0 ? (
        <Cartao className="mt-4">
          <p className="text-center text-sm text-noite/65">
            {pode(perfil, "ver-agenda-de-todos") ? (
              <>
                Nenhum profissional ativo.{" "}
                <Link href="/painel/profissionais" className="font-medium text-on hover:underline">
                  Cadastre quem atende
                </Link>
                .
              </>
            ) : (
              "Seu login ainda não está ligado a uma agenda. Peça ao Dono(a) do salão para marcar “sou eu” no seu cadastro de profissional."
            )}
          </p>
        </Cartao>
      ) : (
        <Grade colunas={colunas} r={r} agora={agora} hoje={hoje} vista={vista} podeAgendar={podeAgendar} />
      )}
    </>
  );
}

const BOTAO_DIA =
  "flex size-10 items-center justify-center rounded-xl border border-noite/12 bg-white text-lg text-noite hover:border-on/50";

function Resumo({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="flex items-baseline gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-noite/5">
      <span className="text-xl font-semibold tabular-nums sm:text-2xl">{valor}</span>
      <span className="text-sm text-noite/65">{rotulo}</span>
    </div>
  );
}

const ESTILO_STATUS: Record<Status, string> = {
  confirmado: "border-confirmado bg-[#E3F8EF]",
  agendado: "border-on bg-[#EAF0FF]",
  concluido: "border-noite/35 bg-[#EEF0F6]",
  faltou: "border-red-500 bg-[#FDECEC]",
  cancelado: "border-noite/20 bg-white/80 text-noite/65 line-through",
};

function Legenda() {
  const itens: [Status, string][] = [
    ["confirmado", "bg-confirmado"],
    ["agendado", "bg-on"],
    ["concluido", "bg-noite/35"],
    ["faltou", "bg-red-500"],
  ];
  return (
    <ul aria-label="Legenda" className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-noite/65">
      {itens.map(([status, cor]) => (
        <li key={status} className="flex items-center gap-1.5">
          <span aria-hidden className={`size-2.5 rounded-sm ${cor}`} />
          <span className="first-letter:uppercase">{NOME_STATUS[status]}</span>
        </li>
      ))}
    </ul>
  );
}

function Grade(props: {
  colunas: ColunaAgenda[];
  r: Periodo;
  agora: number | null;
  hoje: string;
  vista: Vista;
  podeAgendar: boolean;
}) {
  const { colunas, r, agora, hoje, vista } = props;
  const altura = (r.ate - r.de) * PX_POR_MIN;
  const horas = Array.from({ length: (r.ate - r.de) / 60 + 1 }, (_, i) => r.de + i * 60);
  const largura = vista === "semana" ? "8.5rem" : "11rem";
  const estiloGrade: CSSProperties = { gridTemplateColumns: `3.5rem repeat(${colunas.length}, minmax(${largura}, 1fr))` };

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-noite/5">
      <div className="grid min-w-full" style={estiloGrade}>
        {/* Cabeçalho */}
        <div className="sticky left-0 z-20 border-b border-noite/8 bg-white" />
        {colunas.map((c) => (
          <Cabecalho key={c.chave} coluna={c} vista={vista} hoje={hoje} />
        ))}

        {/* Horas */}
        {/* sticky já é posicionado: serve de referência para os rótulos absolutos */}
        <div className="sticky left-0 z-20 bg-white" style={{ height: altura }}>
          {horas.map((h) => (
            <span
              key={h}
              // A primeira hora fica logo abaixo do cabeçalho (sem subir meia linha e ser cortada).
              className={`absolute right-2 text-xs tabular-nums text-noite/65 ${h === r.de ? "translate-y-0.5" : "-translate-y-1/2"}`}
              style={{ top: (h - r.de) * PX_POR_MIN }}
            >
              {h < r.ate ? paraHora(h) : ""}
            </span>
          ))}
        </div>

        {colunas.map((c) => (
          <Coluna
            key={c.chave}
            coluna={c}
            altura={altura}
            r={r}
            agora={c.dia === hoje ? agora : null}
            podeAgendar={props.podeAgendar}
            rotuloDia={vista === "semana" ? rotuloData(c.dia) : undefined}
          />
        ))}
      </div>
      {agora !== null && agora >= r.de && agora <= r.ate ? (
        <p className="sr-only">Agora: {paraHora(agora)}</p>
      ) : null}
    </div>
  );
}

function Cabecalho({ coluna: c, vista, hoje }: { coluna: ColunaAgenda; vista: Vista; hoje: string }) {
  const qtd = c.itens.filter((i) => i.status !== "cancelado").length;
  const folgaInteira = c.folgas.some((f) => f.de === 0 && f.ate === 24 * 60);

  if (vista === "dia") {
    const aviso = folgaInteira ? " · folga" : c.faixas.length === 0 ? " · não atende neste dia" : "";
    return (
      <div className="flex items-center gap-3 border-b border-l border-noite/8 px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-on/10 text-sm font-semibold text-on">
          {iniciais(c.nome)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{c.nome}</p>
          <p className="text-xs text-noite/65">
            {qtd} agend.
            {aviso}
          </p>
        </div>
      </div>
    );
  }

  // Semana: o dia leva à visão de dia do mesmo profissional.
  const ehHoje = c.dia === hoje;
  return (
    <Link
      href={hrefAgenda({ vista: "dia", dia: c.dia, profissional: c.profissionalId })}
      aria-current={ehHoje ? "date" : undefined}
      className={`border-b border-l border-noite/8 px-3 py-3 hover:bg-on/5 ${ehHoje ? "bg-on/5" : ""}`}
    >
      <p className={`truncate font-semibold first-letter:uppercase ${ehHoje ? "text-on" : ""}`}>
        {ehHoje ? `Hoje, ${rotuloData(c.dia).split(", ")[1]}` : rotuloData(c.dia)}
      </p>
      <p className="truncate text-xs text-noite/65">
        {qtd} agend.
        {folgaInteira ? " · folga" : c.faixas.length === 0 ? " · não atende" : ""}
      </p>
    </Link>
  );
}

function Coluna({
  coluna: c,
  altura,
  r,
  agora,
  podeAgendar,
  rotuloDia,
}: {
  coluna: ColunaAgenda;
  altura: number;
  r: Periodo;
  agora: number | null;
  podeAgendar: boolean;
  /** Semana: o dia entra no rótulo do agendamento (o cabeçalho fica longe na ordem de leitura). */
  rotuloDia?: string;
}) {
  const top = (min: number) => (min - r.de) * PX_POR_MIN;
  const posicoes = ladoALado(c.itens.map((i) => i.periodo));
  const atalhos = podeAgendar
    ? Array.from({ length: (r.ate - r.de) / PASSO_NOVO }, (_, i) => r.de + i * PASSO_NOVO)
    : [];

  return (
    <div
      className="relative border-l border-noite/8"
      style={{
        height: altura,
        // Linhas de hora (cheia) e de meia hora (tracejada visualmente mais clara).
        backgroundImage: `repeating-linear-gradient(to bottom, rgb(15 27 77 / 0.07) 0 1px, transparent 1px ${30 * PX_POR_MIN}px)`,
      }}
    >
      {semAtendimento(c.faixas, r).map((l) => (
        <div
          key={`${l.tipo}-${l.de}`}
          className={`absolute inset-x-0 ${l.tipo === "intervalo" ? "px-3 pt-1.5" : ""}`}
          style={{
            top: top(l.de),
            height: (l.ate - l.de) * PX_POR_MIN,
            background:
              l.tipo === "intervalo"
                ? "repeating-linear-gradient(135deg, rgb(15 27 77 / 0.05) 0 8px, rgb(15 27 77 / 0.02) 8px 16px)"
                : "rgb(15 27 77 / 0.035)",
          }}
        >
          {l.tipo === "intervalo" && (l.ate - l.de) * PX_POR_MIN >= 36 ? (
            <p className="truncate text-xs font-medium text-noite/65">
              Intervalo {paraHora(l.de)}–{paraHora(l.ate)}
            </p>
          ) : null}
        </div>
      ))}

      {c.folgas.map((f) => (
        <div
          key={`folga-${f.de}`}
          className="absolute inset-x-0 px-3 pt-1.5"
          style={{
            top: top(Math.max(f.de, r.de)),
            height: (Math.min(f.ate, r.ate) - Math.max(f.de, r.de)) * PX_POR_MIN,
            background: "repeating-linear-gradient(135deg, rgb(239 68 68 / 0.08) 0 8px, rgb(239 68 68 / 0.03) 8px 16px)",
          }}
        >
          <p className="truncate text-xs font-medium text-red-700/70">{f.motivo ?? "Folga"}</p>
        </div>
      ))}

      {/* Atalhos só para mouse e toque: fora do Tab e do leitor de tela (dezenas por coluna). No teclado,
          o botão "+ Novo agendamento" faz o mesmo. */}
      {atalhos.map((m) => (
        <Link
          key={m}
          tabIndex={-1}
          aria-hidden
          href={`/painel/agenda/novo?dia=${c.dia}&profissional=${c.profissionalId}&hora=${paraHora(m)}`}
          className="group absolute inset-x-1 flex items-start rounded-md px-2 pt-1 text-xs font-medium text-on opacity-0 transition-opacity hover:bg-on/5 hover:opacity-100"
          style={{ top: top(m), height: PASSO_NOVO * PX_POR_MIN }}
        >
          + {paraHora(m)}
        </Link>
      ))}

      {c.itens.map((item, i) => (
        <Bloco key={item.id} item={item} top={top(item.periodo.de)} posicao={posicoes[i]} rotuloDia={rotuloDia} />
      ))}

      {agora !== null && agora >= r.de && agora <= r.ate ? (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-red-500" style={{ top: top(agora) }} />
      ) : null}
    </div>
  );
}

function Bloco({
  item,
  top,
  posicao,
  rotuloDia,
}: {
  item: ItemAgenda;
  top: number;
  posicao: { coluna: number; colunas: number };
  rotuloDia?: string;
}) {
  const duracao = item.periodo.ate - item.periodo.de;
  const altura = Math.max(duracao * PX_POR_MIN - 3, 22);
  const largura = 100 / posicao.colunas;
  const hora = `${paraHora(item.periodo.de)}${duracao >= 60 ? `–${paraHora(item.periodo.ate)}` : ""}`;
  const prefixo = item.status === "faltou" ? "Faltou · " : item.status === "cancelado" ? "Cancelado · " : "";
  const conteudo = (
    <>
      <span className="block truncate text-sm font-semibold">{item.clienteNome}</span>
      {altura >= 40 ? (
        <span className="block truncate text-xs opacity-80">
          {prefixo}
          {item.servico} · {hora}
        </span>
      ) : null}
    </>
  );
  const classe = `absolute z-[5] overflow-hidden rounded-lg border-l-4 px-2.5 py-1.5 text-noite ${ESTILO_STATUS[item.status]}`;
  const estilo: CSSProperties = {
    top: top + 1,
    height: altura,
    left: `calc(${posicao.coluna * largura}% + 4px)`,
    width: `calc(${largura}% - 8px)`,
  };
  const titulo = `${item.clienteNome} · ${item.servico} · ${rotuloDia ? `${rotuloDia}, ` : ""}${hora} · ${NOME_STATUS[item.status]}`;

  return (
    <Link
      href={`/painel/agenda/${item.id}`}
      title={titulo}
      // Em blocos curtos só o nome aparece; o leitor de tela recebe tudo.
      aria-label={titulo}
      className={`${classe} hover:brightness-[0.98] focus-visible:outline-2 focus-visible:outline-on`}
      style={estilo}
    >
      {conteudo}
    </Link>
  );
}
