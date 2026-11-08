import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BotaoLink, Cartao } from "@/components/ui";
import { exigirVinculo, podeEditarCadastro } from "@/lib/auth";
import { iniciais } from "@/lib/formato";
import { listarProfissionais } from "./dados";

export const metadata: Metadata = { title: "Profissionais · AgendOn" };

export default function PaginaProfissionais() {
  return (
    <div className="mx-auto max-w-5xl">
      <Suspense fallback={<h1 className="text-2xl font-semibold sm:text-3xl">Profissionais</h1>}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

async function Conteudo() {
  const { salao, perfil, membroId } = await exigirVinculo();
  const podeCadastrar = podeEditarCadastro(perfil);
  const profissionais = await listarProfissionais(salao.id);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold sm:text-3xl">Profissionais</h1>
        {podeCadastrar ? (
          <BotaoLink href="/painel/profissionais/novo">+ Adicionar profissional</BotaoLink>
        ) : null}
      </div>

      {profissionais.length === 0 ? (
        <Cartao className="mt-6 text-center">
          <p className="font-medium">Nenhum profissional cadastrado</p>
          <p className="mt-1 text-sm text-noite/60">
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
                    p.ativo ? "bg-on/10 text-on" : "bg-noite/5 text-noite/40"
                  }`}
                >
                  {iniciais(p.nome)}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">
                    {p.nome}
                    {p.memberId === membroId ? <span className="ml-2 text-xs font-medium text-on">você</span> : null}
                    {!p.ativo ? <span className="ml-2 text-xs font-normal text-noite/50">inativo</span> : null}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-noite/60">
                    {p.servicos.length > 0 ? p.servicos.join(", ") : "Nenhum serviço definido"}
                  </p>
                  <p className="mt-1 text-xs text-noite/50">
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
