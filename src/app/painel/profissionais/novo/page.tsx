import type { Metadata } from "next";
import { Cartao } from "@/components/ui";
import { PaginaProtegida } from "@/components/pagina-protegida";
import type { Vinculo } from "@/lib/auth";
import { listarProfissionais } from "../dados";
import { FormNovoProfissional } from "./form-novo";

export const metadata: Metadata = { title: "Novo profissional · AgendOn" };

export default function PaginaNovoProfissional() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold sm:text-3xl">Novo profissional</h1>
      <Cartao className="mt-6">
        <PaginaProtegida exige="editar-profissionais" senao="/painel/profissionais" carregando={<div className="h-48" />}>
          {({ vinculo }) => <Formulario vinculo={vinculo} />}
        </PaginaProtegida>
      </Cartao>
    </div>
  );
}

async function Formulario({ vinculo: { salao, membroId } }: { vinculo: Vinculo }) {
  const jaSouProfissional = (await listarProfissionais(salao.id)).some((p) => p.memberId === membroId);
  return <FormNovoProfissional podeSerEu={!jaSouProfissional} />;
}
