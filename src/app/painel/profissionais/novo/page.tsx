import type { Metadata } from "next";
import { Suspense } from "react";
import { Cartao } from "@/components/ui";
import { exigirPermissao } from "@/lib/auth";
import { listarProfissionais } from "../dados";
import { FormNovoProfissional } from "./form-novo";

export const metadata: Metadata = { title: "Novo profissional · AgendOn" };

export default function PaginaNovoProfissional() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold sm:text-3xl">Novo profissional</h1>
      <Cartao className="mt-6">
        <Suspense fallback={<div className="h-48" />}>
          <Guarda />
        </Suspense>
      </Cartao>
    </div>
  );
}

async function Guarda() {
  const { salao, membroId } = await exigirPermissao("editar-profissionais", "/painel/profissionais");
  const jaSouProfissional = (await listarProfissionais(salao.id)).some((p) => p.memberId === membroId);
  return <FormNovoProfissional podeSerEu={!jaSouProfissional} />;
}
