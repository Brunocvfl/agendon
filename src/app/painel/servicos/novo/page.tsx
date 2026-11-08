import type { Metadata } from "next";
import { Suspense } from "react";
import { Cartao } from "@/components/ui";
import { exigirPermissao } from "@/lib/auth";
import { FormServico } from "../form-servico";

export const metadata: Metadata = { title: "Novo serviço · AgendOn" };

export default function PaginaNovoServico() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold sm:text-3xl">Novo serviço</h1>
      <Cartao className="mt-6">
        <Suspense fallback={<div className="h-64" />}>
          <Guarda />
        </Suspense>
      </Cartao>
    </div>
  );
}

async function Guarda() {
  await exigirPermissao("editar-servicos", "/painel/servicos");
  return <FormServico />;
}
