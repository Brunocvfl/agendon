import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cartao } from "@/components/ui";
import { PaginaProtegida } from "@/components/pagina-protegida";
import type { Vinculo } from "@/lib/auth";
import { buscarServico } from "../dados";
import { FormServico } from "../form-servico";

export const metadata: Metadata = { title: "Editar serviço · AgendOn" };

export default function PaginaEditarServico({ params }: PageProps<"/painel/servicos/[id]">) {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold sm:text-3xl">Editar serviço</h1>
      <Cartao className="mt-6">
        <PaginaProtegida exige="editar-servicos" senao="/painel/servicos" params={params} carregando={<div className="h-64" />}>
          {(ctx) => <Conteudo {...ctx} />}
        </PaginaProtegida>
      </Cartao>
    </div>
  );
}

async function Conteudo({ vinculo: { salao }, id }: { vinculo: Vinculo; id: string }) {
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
