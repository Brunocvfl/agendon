import type { Metadata } from "next";
import { Cartao } from "@/components/ui";
import { PaginaProtegida } from "@/components/pagina-protegida";
import { FormCliente } from "../form-cliente";

export const metadata: Metadata = { title: "Novo cliente · AgendOn" };

export default function PaginaNovoCliente() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold sm:text-3xl">Novo cliente</h1>
      <Cartao className="mt-6">
        <PaginaProtegida exige="ver-clientes" senao="/painel" carregando={<div className="h-64" />}>
          {() => <FormCliente />}
        </PaginaProtegida>
      </Cartao>
    </div>
  );
}
