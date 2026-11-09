import type { Metadata } from "next";
import Link from "next/link";
import { Cartao } from "@/components/ui";
import { PaginaProtegida } from "@/components/pagina-protegida";
import type { Vinculo } from "@/lib/auth";
import { dataNoFuso, ehData } from "@/lib/datas";
import { ehUuid } from "@/lib/ids";
import { pode } from "@/lib/permissoes";
import { opcoesAgendamento } from "../dados";
import { FormAgendamento } from "./form-agendamento";

export const metadata: Metadata = { title: "Novo agendamento · AgendOn" };

type Busca = Promise<Record<string, string | string[] | undefined>>;

export default function PaginaNovoAgendamento({ searchParams }: PageProps<"/painel/agenda/novo">) {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/painel/agenda" className="text-sm font-medium text-on hover:underline">
        ← Agenda
      </Link>
      <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">Novo agendamento</h1>
      <Cartao className="mt-6">
        {/* Profissional agenda só na própria agenda (opcoesAgendamento e o banco restringem). */}
        <PaginaProtegida exige="criar-agendamento" senao="/painel/agenda" carregando={<div className="h-96" />}>
          {({ vinculo }) => <Conteudo vinculo={vinculo} searchParams={searchParams} />}
        </PaginaProtegida>
      </Cartao>
    </div>
  );
}

const umValor = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function Conteudo({ vinculo, searchParams }: { vinculo: Vinculo; searchParams: Busca }) {
  const { salao, perfil } = vinculo;
  const sp = await searchParams;
  const opcoes = await opcoesAgendamento(vinculo);

  const dia = ehData(umValor(sp.dia)) ? umValor(sp.dia) : dataNoFuso(new Date(), salao.fuso);
  const profissional = ehUuid(umValor(sp.profissional)) ? umValor(sp.profissional) : "";
  const hora = /^\d{2}:\d{2}$/.test(umValor(sp.hora)) ? umValor(sp.hora) : "";

  if (!pode(perfil, "ver-agenda-de-todos") && opcoes.profissionais.length === 0) {
    return (
      <p className="text-sm text-noite/65">
        Seu login ainda não está ligado a uma agenda. Peça ao Dono(a) do salão para marcar &quot;sou eu&quot; no seu cadastro
        de profissional.
      </p>
    );
  }

  if (opcoes.profissionais.length === 0 || opcoes.servicos.length === 0) {
    return (
      <p className="text-sm text-noite/65">
        Para agendar, cadastre pelo menos um{" "}
        <Link href="/painel/servicos" className="font-medium text-on hover:underline">
          serviço
        </Link>{" "}
        e um{" "}
        <Link href="/painel/profissionais" className="font-medium text-on hover:underline">
          profissional
        </Link>{" "}
        que o faça.
      </p>
    );
  }

  return <FormAgendamento opcoes={opcoes} inicial={{ dia, profissional, hora }} buscaPorTelefone={pode(perfil, "ver-clientes")} />;
}
