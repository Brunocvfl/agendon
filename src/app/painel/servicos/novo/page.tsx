import type { Metadata } from "next";
import { Cartao } from "@/components/ui";
import { PaginaProtegida } from "@/components/pagina-protegida";
import { FormServico } from "../form-servico";

export const metadata: Metadata = { title: "Novo serviço · AgendOn" };

export default function PaginaNovoServico() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold sm:text-3xl">Novo serviço</h1>
      <Cartao className="mt-6">
        <PaginaProtegida exige="editar-servicos" senao="/painel/servicos" carregando={<div className="h-64" />}>
          {() => <FormServico />}
        </PaginaProtegida>
      </Cartao>
    </div>
  );
}
