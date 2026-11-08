import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { Cartao } from "@/components/ui";
import { exigirVinculo } from "@/lib/auth";
import { buscarServico } from "../dados";
import { FormServico } from "../form-servico";

export const metadata: Metadata = { title: "Editar serviço · AgendOn" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function PaginaEditarServico({ params }: PageProps<"/painel/servicos/[id]">) {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold sm:text-3xl">Editar serviço</h1>
      <Cartao className="mt-6">
        <Suspense fallback={<div className="h-64" />}>
          <Conteudo params={params} />
        </Suspense>
      </Cartao>
    </div>
  );
}

async function Conteudo({ params }: { params: PageProps<"/painel/servicos/[id]">["params"] }) {
  const { id } = await params;
  const { salao, perfil } = await exigirVinculo();
  if (perfil !== "dono") redirect("/painel/servicos");
  if (!UUID_RE.test(id)) notFound();

  const servico = await buscarServico(salao.id, id);
  if (!servico) notFound();

  return (
    <FormServico
      inicial={{
        id: servico.id,
        nome: servico.nome,
        duracao: String(servico.duracao_min),
        preco: servico.preco.toFixed(2).replace(".", ","),
      }}
    />
  );
}
