import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { BotaoLink, Cartao } from "@/components/ui";
import { PaginaProtegida } from "@/components/pagina-protegida";
import type { Vinculo } from "@/lib/auth";
import { formatarDiaMes, formatarMesAno, formatarTelefone, iniciais } from "@/lib/formato";
import { listarClientes, POR_PAGINA, type ClienteDaLista } from "./dados";

type Datas = { diaMes: (iso: string) => string; mesAno: (iso: string) => string };

export const metadata: Metadata = { title: "Clientes · AgendOn" };

type Busca = Promise<Record<string, string | string[] | undefined>>;

export default function PaginaClientes({ searchParams }: PageProps<"/painel/clientes">) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold sm:text-3xl">Clientes</h1>
        <BotaoLink href="/painel/clientes/novo">+ Novo cliente</BotaoLink>
      </div>
      <PaginaProtegida exige="ver-clientes" senao="/painel" carregando={<Cartao className="mt-6 h-64">{null}</Cartao>}>
        {({ vinculo }) => <Conteudo vinculo={vinculo} searchParams={searchParams} />}
      </PaginaProtegida>
    </div>
  );
}

const umValor = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function Conteudo({ vinculo: { salao }, searchParams }: { vinculo: Vinculo; searchParams: Busca }) {
  const sp = await searchParams;
  const busca = umValor(sp.q).trim().slice(0, 80);
  const pagina = Math.max(1, Math.floor(Number(umValor(sp.p)) || 1));
  const { clientes, total } = await listarClientes(salao.id, busca, pagina);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const link = (p: number) => `/painel/clientes?${new URLSearchParams({ ...(busca ? { q: busca } : {}), p: String(p) })}`;

  const data = { diaMes: (iso: string) => formatarDiaMes(iso, salao.fuso), mesAno: (iso: string) => formatarMesAno(iso, salao.fuso) };

  return (
    <>
      <Form action="/painel/clientes" className="mt-6" role="search">
        <label htmlFor="q" className="sr-only">
          Buscar por nome ou WhatsApp
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={busca}
          placeholder="Buscar por nome ou WhatsApp"
          maxLength={80}
          className="h-11 w-full rounded-xl border border-noite/15 bg-white px-3.5 text-base text-noite outline-none transition-colors placeholder:text-noite/35 focus:border-on focus:ring-2 focus:ring-on/20 sm:max-w-md"
        />
      </Form>

      <Cartao className="mt-4 !p-0 sm:!p-0">
        {clientes.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-medium">{busca ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}</p>
            <p className="mt-1 text-sm text-noite/65">
              {busca
                ? "Confira o nome ou os números do WhatsApp."
                : "Os clientes aparecem aqui ao agendar pela página pública ou ao cadastrar pelo painel."}
            </p>
          </div>
        ) : (
          <>
            {/* Títulos só visuais: cada célula leva o próprio rótulo para o leitor de tela. */}
            <div aria-hidden className="hidden grid-cols-[1fr_10rem_8rem_5rem_5rem] gap-4 border-b border-noite/8 px-6 py-3 text-sm text-noite/65 md:grid">
              <span>Cliente</span>
              <span>WhatsApp</span>
              <span>Último atendimento</span>
              <span className="text-right">Visitas</span>
              <span className="text-right">Faltas</span>
            </div>
            <ul>
              {clientes.map((c) => (
                <Linha key={c.id} c={c} data={data} />
              ))}
            </ul>
          </>
        )}
      </Cartao>

      {total > 0 ? (
        <nav aria-label="Páginas" className="mt-4 flex items-center justify-between text-sm text-noite/65">
          <span>
            Mostrando {(pagina - 1) * POR_PAGINA + 1} a {Math.min(pagina * POR_PAGINA, total)} de {total}
          </span>
          <span className="flex gap-4">
            {pagina > 1 ? (
              <Link href={link(pagina - 1)} className="font-medium text-on hover:underline">
                ← Anterior
              </Link>
            ) : null}
            {pagina < paginas ? (
              <Link href={link(pagina + 1)} className="font-medium text-on hover:underline">
                Próxima →
              </Link>
            ) : null}
          </span>
        </nav>
      ) : null}
    </>
  );
}

function Linha({ c, data }: { c: ClienteDaLista; data: Datas }) {
  const ultimo = c.ultimoAtendimento ? data.diaMes(c.ultimoAtendimento) : "—";
  return (
    <li className="relative grid grid-cols-[auto_1fr_auto] items-center gap-x-3 border-b border-noite/8 px-5 py-3.5 last:border-b-0 hover:bg-fundo md:grid-cols-[1fr_10rem_8rem_5rem_5rem] md:gap-4 md:px-6">
      <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-on/10 text-sm font-semibold text-on md:hidden">
        {iniciais(c.nome)}
      </span>
      <div className="min-w-0">
        {/* O link cobre a linha inteira (::after), mas só o nome é lido como link. */}
        <Link href={`/painel/clientes/${c.id}`} className="font-semibold after:absolute after:inset-0 hover:text-on">
          {c.nome}
        </Link>
        <p className="text-sm text-noite/65">
          <span className="md:hidden">{formatarTelefone(c.telefone)} · </span>
          Cliente desde {data.mesAno(c.criadoEm)}
        </p>
      </div>
      <span className="hidden text-sm tabular-nums md:block">
        <span className="sr-only">WhatsApp: </span>
        {formatarTelefone(c.telefone)}
      </span>
      <span className="hidden text-sm md:block">
        <span className="sr-only">Último atendimento: </span>
        {ultimo}
      </span>
      <span className="hidden text-right text-sm tabular-nums md:block">
        {c.visitas}
        <span className="sr-only"> {c.visitas === 1 ? "visita" : "visitas"}</span>
      </span>
      <span className="text-right text-sm tabular-nums">
        <span
          className={`inline-block min-w-7 rounded-md px-1.5 py-0.5 text-center text-xs font-semibold ${
            c.faltas > 0 ? "bg-red-50 text-red-600" : "bg-confirmado/10 text-confirmado-escuro"
          }`}
          title={`${c.faltas} ${c.faltas === 1 ? "falta" : "faltas"}`}
        >
          {c.faltas}
          <span className="sr-only"> {c.faltas === 1 ? "falta" : "faltas"}</span>
        </span>
      </span>
    </li>
  );
}
