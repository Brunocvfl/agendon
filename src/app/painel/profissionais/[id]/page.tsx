import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Cartao } from "@/components/ui";
import { exigirVinculo } from "@/lib/auth";
import { pode } from "@/lib/permissoes";
import { iniciais } from "@/lib/formato";
import { DIAS, faixasParaTela, resumoDia } from "@/lib/horarios";
import { buscarProfissional, listarServicosAtivos } from "../dados";
import { FormDados } from "./form-dados";
import { FormServicos } from "./form-servicos";
import { FormHorarios } from "./form-horarios";
import { Folgas } from "./folgas";

export const metadata: Metadata = { title: "Profissional · AgendOn" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function PaginaProfissional({ params }: PageProps<"/painel/profissionais/[id]">) {
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/painel/profissionais" className="text-sm font-medium text-on hover:underline">
        ← Profissionais
      </Link>
      <Suspense fallback={<p className="mt-4 text-sm text-noite/60">Carregando…</p>}>
        <Conteudo params={params} />
      </Suspense>
    </div>
  );
}

async function Conteudo({ params }: { params: PageProps<"/painel/profissionais/[id]">["params"] }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { salao, perfil, membroId } = await exigirVinculo();
  const [profissional, servicos] = await Promise.all([
    buscarProfissional(salao.id, id),
    listarServicosAtivos(salao.id),
  ]);
  if (!profissional) notFound();

  const editaCadastro = pode(perfil, "editar-profissionais");
  const editaHorarios = pode(perfil, "editar-horarios");
  const dias = faixasParaTela(profissional.faixas);

  return (
    <>
      <div className="mt-4 flex items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-full bg-on/10 text-lg font-semibold text-on">
          {iniciais(profissional.nome)}
        </span>
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{profissional.nome}</h1>
          <p className="text-sm text-noite/60">
            {profissional.ativo ? "Ativo" : "Inativo: não aparece na agenda nem na página pública"}
            {profissional.memberId === membroId ? " · este é você" : ""}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6">
        {editaCadastro ? (
          <Cartao>
            <h2 className="text-lg font-semibold">Dados</h2>
            <FormDados id={profissional.id} nome={profissional.nome} ativo={profissional.ativo} />
          </Cartao>
        ) : null}

        <Cartao>
          <h2 className="text-lg font-semibold">Serviços que atende</h2>
          {servicos.length === 0 ? (
            <p className="mt-2 text-sm text-noite/60">
              Nenhum serviço ativo.{" "}
              {editaCadastro ? (
                <Link href="/painel/servicos/novo" className="font-medium text-on hover:underline">
                  Cadastre um serviço
                </Link>
              ) : null}
            </p>
          ) : editaCadastro ? (
            <FormServicos id={profissional.id} servicos={servicos} marcados={profissional.servicoIds} />
          ) : (
            <p className="mt-2 text-sm">
              {servicos
                .filter((s) => profissional.servicoIds.includes(s.id))
                .map((s) => s.nome)
                .join(", ") || "Nenhum serviço definido."}
            </p>
          )}
        </Cartao>

        <Cartao>
          <h2 className="text-lg font-semibold">Horário de trabalho</h2>
          {editaHorarios ? (
            <FormHorarios id={profissional.id} dias={dias} />
          ) : (
            <dl className="mt-4 grid gap-2 text-sm">
              {DIAS.map(({ n, curto }) => (
                <div key={n} className="flex gap-4">
                  <dt className="w-10 font-medium">{curto}</dt>
                  <dd className="text-noite/70">{resumoDia(dias.find((d) => d.dia === n)!)}</dd>
                </div>
              ))}
            </dl>
          )}
        </Cartao>

        <Cartao>
          <h2 className="text-lg font-semibold">Folgas e bloqueios</h2>
          <p className="mt-1 text-sm text-noite/60">
            Períodos em que o profissional não atende (férias, compromissos). Horários no fuso do salão.
          </p>
          <Folgas id={profissional.id} folgas={profissional.folgas} fuso={salao.fuso} podeEditar={editaHorarios} />
        </Cartao>
      </div>
    </>
  );
}
