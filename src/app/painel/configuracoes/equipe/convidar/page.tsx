import type { Metadata } from "next";
import Link from "next/link";
import { Cartao } from "@/components/ui";
import { PaginaProtegida } from "@/components/pagina-protegida";
import { agendasLivres } from "../dados";
import { FormMembro } from "../form-membro";

export const metadata: Metadata = { title: "Convidar pessoa · AgendOn" };

export default function PaginaConvidar() {
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/painel/configuracoes/equipe" className="text-sm font-medium text-on hover:underline">
        ← Equipe e acessos
      </Link>
      <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Convidar pessoa</h1>
      <Cartao className="mt-6">
        <PaginaProtegida exige="gerenciar-salao">
          {async ({ vinculo }) => <FormMembro agendas={await agendasLivres(vinculo.salao.id)} />}
        </PaginaProtegida>
      </Cartao>
    </div>
  );
}
