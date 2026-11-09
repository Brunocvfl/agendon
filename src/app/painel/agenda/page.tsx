import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import type { CSSProperties } from "react";
import { BotaoLink, Cartao } from "@/components/ui";
import { PaginaProtegida } from "@/components/pagina-protegida";
import type { Vinculo } from "@/lib/auth";
import { ladoALado, regua, semAtendimento, type Periodo } from "@/lib/agenda";
import { dataNoFuso, ehData, minutosNoFuso, paraHora, rotuloData, somarDias } from "@/lib/datas";
import { formatarPreco, iniciais, NOME_STATUS } from "@/lib/formato";
import { pode } from "@/lib/permissoes";
import { carregarAgenda, type ColunaAgenda, type ItemAgenda, type Status } from "./dados";

export const metadata: Metadata = { title: "Agenda · AgendOn" };

type Busca = Promise<Record<string, string | string[] | undefined>>;

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

async function Conteudo({ vinculo, searchParams }: { vinculo: Vinculo; searchParams: Busca }) {
  const { salao, perfil } = vinculo;
  const sp = await searchParams;
  const hoje = dataNoFuso(new Date(), salao.fuso);
  const pedido = umValor(sp.dia);
  const dia = ehData(pedido) ? pedido : hoje;
  // Profissional agenda só na própria agenda, que é a única coluna que ele vê.
  const podeAgendar = pode(perfil, "criar-agendamento");

  const colunas = await carregarAgenda(vinculo, dia);
  const todos = colunas.flatMap((c) => c.itens);
  const ativos = todos.filter((i) => i.status !== "cancelado");
  const previsto = ativos.filter((i) => i.status !== "faltou").reduce((s, i) => s + i.preco, 0);
  const r = regua(colunas.flatMap((c) => [...c.faixas, ...c.itens.map((i) => i.periodo)]));
  const agora = dia === hoje ? minutosNoFuso(new Date(), salao.fuso) : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-2 text-2xl font-semibold sm:text-3xl">Agenda</h1>
        <nav aria-label="Dia" className="flex items-center gap-2">
          <Link href={`/painel/agenda?dia=${somarDias(dia, -1)}`} aria-label="Dia anterior" className={BOTAO_DIA}>
            ‹
          </Link>
          <Link
            href="/painel/agenda"
            className={`h-10 rounded-xl px-4 text-sm font-semibold leading-10 ${dia === hoje ? "bg-noite text-white" : "border border-noite/12 bg-white hover:border-on/50"}`}
          >
            {dia === hoje ? `Hoje · ${rotuloData(dia)}` : rotuloData(dia)}
          </Link>
          <Link href={`/painel/agenda?dia=${somarDias(dia, 1)}`} aria-label="Próximo dia" className={BOTAO_DIA}>
            ›
          </Link>
        </nav>
        <Form action="/painel/agenda" className="flex items-center gap-2">
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
        {podeAgendar ? (
          <BotaoLink href={`/painel/agenda/novo?dia=${dia}`} className="ml-auto">
            + Novo agendamento
          </BotaoLink>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Resumo valor={String(ativos.length)} rotulo={ativos.length === 1 ? "agendamento" : "agendamentos"} />
        <Resumo valor={String(ativos.filter((i) => i.status === "confirmado").length)} rotulo="confirmados" />
        <Resumo valor={String(ativos.filter((i) => i.status === "agendado").length)} rotulo="aguardando confirmação" />
        <Resumo valor={formatarPreco(previsto)} rotulo="previsto no dia" />
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
        <Grade colunas={colunas} r={r} agora={agora} dia={dia} podeAgendar={podeAgendar} />
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
  dia: string;
  podeAgendar: boolean;
}) {
  const { colunas, r, agora } = props;
  const altura = (r.ate - r.de) * PX_POR_MIN;
  const horas = Array.from({ length: (r.ate - r.de) / 60 + 1 }, (_, i) => r.de + i * 60);
  const estiloGrade: CSSProperties = { gridTemplateColumns: `3.5rem repeat(${colunas.length}, minmax(11rem, 1fr))` };

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-noite/5">
      <div className="grid min-w-full" style={estiloGrade}>
        {/* Cabeçalho */}
        <div className="sticky left-0 z-20 border-b border-noite/8 bg-white" />
        {colunas.map((c) => (
          <div key={c.id} className="flex items-center gap-3 border-b border-l border-noite/8 px-4 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-on/10 text-sm font-semibold text-on">
              {iniciais(c.nome)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{c.nome}</p>
              <p className="text-xs text-noite/65">
                {c.itens.filter((i) => i.status !== "cancelado").length} agend.
                {c.faixas.length === 0 ? " · não atende neste dia" : ""}
              </p>
            </div>
          </div>
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
          <Coluna key={c.id} coluna={c} altura={altura} {...props} />
        ))}
      </div>
      {agora !== null && agora >= r.de && agora <= r.ate ? (
        <p className="sr-only">Agora: {paraHora(agora)}</p>
      ) : null}
    </div>
  );
}

function Coluna({
  coluna: c,
  altura,
  r,
  agora,
  dia,
  podeAgendar,
}: {
  coluna: ColunaAgenda;
  altura: number;
  r: Periodo;
  agora: number | null;
  dia: string;
  podeAgendar: boolean;
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
            <p className="text-xs font-medium text-noite/65">
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
          href={`/painel/agenda/novo?dia=${dia}&profissional=${c.id}&hora=${paraHora(m)}`}
          className="group absolute inset-x-1 flex items-start rounded-md px-2 pt-1 text-xs font-medium text-on opacity-0 transition-opacity hover:bg-on/5 hover:opacity-100"
          style={{ top: top(m), height: PASSO_NOVO * PX_POR_MIN }}
        >
          + {paraHora(m)}
        </Link>
      ))}

      {c.itens.map((item, i) => (
        <Bloco key={item.id} item={item} top={top(item.periodo.de)} posicao={posicoes[i]} />
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
}: {
  item: ItemAgenda;
  top: number;
  posicao: { coluna: number; colunas: number };
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
  const titulo = `${item.clienteNome} · ${item.servico} · ${hora} · ${NOME_STATUS[item.status]}`;

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
