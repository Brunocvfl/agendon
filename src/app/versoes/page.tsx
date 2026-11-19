import type { Metadata } from "next";
import Link from "next/link";

// Página temporária para comparar as versões do site. Sai do código quando uma for escolhida.
export const metadata: Metadata = { title: "Versões do site", robots: { index: false } };

const VERSOES = [
  ["/versoes/1", "Versão 1", "Clara, com o celular de teste no topo."],
  ["/versoes/2", "Versão 2", "Azul, com a agenda do dia em números grandes se preenchendo."],
  ["/versoes/3", "Versão 3", "Escura, com o mostrador 3D do dia e o trilho guiado pela rolagem."],
];

export default function Versoes() {
  return (
    <main id="conteudo" className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Versões do site</h1>
      <ul className="mt-8 grid gap-3">
        {VERSOES.map(([href, nome, descricao]) => (
          <li key={href}>
            <Link href={href} className="block rounded-2xl bg-white p-5 ring-1 ring-noite/10 hover:ring-on focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on">
              <span className="font-semibold">{nome}</span>
              <span className="mt-1 block text-noite/70">{descricao}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
