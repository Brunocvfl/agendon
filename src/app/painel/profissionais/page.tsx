import type { Metadata } from "next";
import Link from "next/link";
import { Alerta, BotaoLink, Cartao } from "@/components/ui";
import { PaginaProtegida } from "@/components/pagina-protegida";
import type { Vinculo } from "@/lib/auth";
import { pode } from "@/lib/permissoes";
import { iniciais } from "@/lib/formato";
import { listarProfissionais } from "./dados";

export const metadata: Metadata = { title: "Profissionais · AgendOn" };

const AVISOS: Record<string, string> = {
  excluido: "Profissional excluído. Os atendimentos antigos continuam no histórico dos clientes.",
};

export default function PaginaProfissionais({ searchParams }: PageProps<"/painel/profissionais">) {
  return (
    <div className="mx-auto max-w-5xl">
      <PaginaProtegida carregando={<h1 className="text-2xl font-semibold sm:text-3xl">Profissionais</h1>}>
        {({ vinculo }) => <Conteudo vinculo={vinculo} searchParams={searchParams} />}
      </PaginaProtegida>
    </div>
  );
}

async function Conteudo({
  vinculo: { salao, perfil, membroId },
  searchParams,
}: {
  vinculo: Vinculo;
  searchParams: PageProps<"/painel/profissionais">["searchParams"];
}) {
  const podeCadastrar = pode(perfil, "editar-profissionais");
  const [profissionais, sp] = await Promise.all([listarProfissionais(salao.id), searchParams]);
  const aviso = typeof sp.aviso === "string" ? AVISOS[sp.aviso] : undefined;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold sm:text-3xl">Profissionais</h1>
        {podeCadastrar ? (
          <BotaoLink href="/painel/profissionais/novo">+ Adicionar profissional</BotaoLink>
        ) : null}
      </div>
      {aviso ? (
        <div className="mt-6">
          <Alerta tipo="sucesso">{aviso}</Alerta>
        </div>
      ) : null}

      {profissionais.length === 0 ? (
        <Cartao className="mt-6 text-center">
          <p className="font-medium">Nenhum profissional cadastrado</p>
          <p className="mt-1 text-sm text-noite/65">
            {podeCadastrar
              ? "Cadastre quem atende no salão. Se você também atende, marque “sou eu” no cadastro."
              : "Peça ao Dono(a) do salão para cadastrar os profissionais."}
          </p>
        </Cartao>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profissionais.map((p) => (
            <li key={p.id}>
              <Link
                href={`/painel/profissionais/${p.id}`}
                className="flex h-full gap-4 rounded-2xl border border-noite/8 bg-white p-5 shadow-sm transition-colors hover:border-on/40"
              >
                <span
                  aria-hidden
                  className={`flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    p.ativo ? "bg-on/10 text-on" : "bg-noite/5 text-noite/65"
                  }`}
                >
                  {iniciais(p.nome)}
                </span>
                <div className="min-w-0">
                  <p className="break-words font-semibold">
                    {p.nome}
                    {p.memberId === membroId ? <span className="ml-2 text-xs font-medium text-on">você</span> : null}
                    {!p.ativo ? <span className="ml-2 text-xs font-normal text-noite/65">inativo</span> : null}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-noite/65">
                    {p.servicos.length > 0 ? p.servicos.join(", ") : "Nenhum serviço definido"}
                  </p>
                  <p className="mt-1 text-xs text-noite/65">
                    {p.diasTrabalho === 0
                      ? "Sem horário de trabalho"
                      : `Atende ${p.diasTrabalho} ${p.diasTrabalho === 1 ? "dia" : "dias"} por semana`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
