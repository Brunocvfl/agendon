import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cartao } from "@/components/ui";
import { exigirVinculo } from "@/lib/auth";
import { formatarDuracao, formatarPreco, iniciais } from "@/lib/formato";
import { listarServicos } from "./dados";
import { SwitchAtivo } from "./switch-ativo";

export const metadata: Metadata = { title: "Serviços · AgendOn" };

export default function PaginaServicos() {
  return (
    <div className="mx-auto max-w-5xl">
      <Suspense fallback={<Cabecalho podeEditar={false} />}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

function Cabecalho({ podeEditar }: { podeEditar: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold sm:text-3xl">Serviços</h1>
      {podeEditar ? (
        <Link
          href="/painel/servicos/novo"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-on px-5 text-sm font-semibold text-white hover:bg-on/90"
        >
          + Novo serviço
        </Link>
      ) : null}
    </div>
  );
}

async function Conteudo() {
  const { salao, perfil } = await exigirVinculo();
  const podeEditar = perfil === "dono";
  const servicos = await listarServicos(salao.id);

  return (
    <>
      <Cabecalho podeEditar={podeEditar} />
      <Cartao className="mt-6 !p-0 sm:!p-0">
        {servicos.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-medium">Nenhum serviço cadastrado</p>
            <p className="mt-1 text-sm text-noite/60">
              {podeEditar
                ? "Cadastre o que o salão oferece, com duração e preço."
                : "Peça ao Dono(a) do salão para cadastrar os serviços."}
            </p>
          </div>
        ) : (
          <>
            {/* Cabeçalho da tabela (só em telas largas) */}
            <div className="hidden grid-cols-[1fr_7rem_7rem_8rem_4rem] gap-4 border-b border-noite/8 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-noite/50 md:grid">
              <span>Serviço</span>
              <span>Duração</span>
              <span>Preço</span>
              <span>Quem faz</span>
              <span className="text-right">Ativo</span>
            </div>
            <ul>
              {servicos.map((s) => (
                <li
                  key={s.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-noite/8 px-5 py-4 last:border-b-0 md:grid-cols-[1fr_7rem_7rem_8rem_4rem] md:px-6"
                >
                  <div className="min-w-0">
                    {podeEditar ? (
                      <Link href={`/painel/servicos/${s.id}`} className="font-semibold hover:text-on hover:underline">
                        {s.nome}
                      </Link>
                    ) : (
                      <span className="font-semibold">{s.nome}</span>
                    )}
                    {!s.ativo ? <span className="ml-2 text-xs text-noite/50">inativo</span> : null}
                    {/* No celular, duração e preço ficam abaixo do nome */}
                    <p className="text-sm text-noite/60 md:hidden">
                      {formatarDuracao(s.duracao_min)} · {formatarPreco(s.preco)}
                    </p>
                  </div>
                  <span className="hidden text-sm md:block">{formatarDuracao(s.duracao_min)}</span>
                  <span className="hidden text-sm md:block">{formatarPreco(s.preco)}</span>
                  <span className="hidden flex-wrap gap-1 md:flex">
                    {s.profissionais.length === 0 ? (
                      <span className="text-sm text-noite/40">—</span>
                    ) : (
                      s.profissionais.map((p) => (
                        <span
                          key={p.id}
                          title={p.nome}
                          className="rounded-md bg-on/10 px-1.5 py-0.5 text-xs font-semibold text-on"
                        >
                          {iniciais(p.nome)}
                        </span>
                      ))
                    )}
                  </span>
                  <div className="row-span-2 flex justify-end md:row-span-1">
                    {podeEditar ? (
                      <SwitchAtivo id={s.id} ativo={s.ativo} nome={s.nome} />
                    ) : (
                      <span className={`text-sm ${s.ativo ? "text-confirmado" : "text-noite/40"}`}>
                        {s.ativo ? "Sim" : "Não"}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Cartao>
      <p className="mt-4 text-sm text-noite/55">
        A duração define quantos horários seguidos o serviço ocupa na agenda e na página pública. Serviços inativos
        não aparecem para os clientes.
      </p>
    </>
  );
}
