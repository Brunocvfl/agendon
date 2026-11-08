import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getUsuario, getVinculo } from "@/lib/auth";
import { sair } from "@/app/(acesso)/actions";
import { ListaMenu, MenuCelular, NavPainel } from "./nav-painel";

export default function LayoutPainel({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      {/* Celular: barra fixa com o nome do salão e o botão de menu */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 bg-noite pl-4 pr-2 text-white md:hidden">
        <Link href="/painel" className="flex min-w-0 items-center gap-2.5">
          <Image src="/simbolo-agendon.png" alt="AgendOn" width={2048} height={2048} className="size-8 shrink-0 rounded-lg" />
          <Suspense fallback={null}>
            <NomeSalao />
          </Suspense>
        </Link>
        <Suspense fallback={<span className="h-10 w-20" />}>
          <MenuCelular conta={<Conta />} />
        </Suspense>
      </header>

      {/* Telas largas: barra lateral */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-noite text-white md:flex">
        <Link href="/painel" className="flex items-center gap-2.5 px-6 py-6">
          <Image src="/simbolo-agendon.png" alt="" width={2048} height={2048} className="size-9 rounded-lg" />
          <span className="text-xl font-semibold tracking-tight">
            Agend<span className="text-on">On</span>
          </span>
        </Link>
        <Suspense fallback={<ListaMenu pathname={null} />}>
          <NavPainel />
        </Suspense>
        <Suspense fallback={null}>
          <Conta />
        </Suspense>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}

async function NomeSalao() {
  const vinculo = await getVinculo();
  return <span className="truncate font-semibold">{vinculo?.salao.nome ?? "AgendOn"}</span>;
}

async function Conta() {
  const [usuario, vinculo] = await Promise.all([getUsuario(), getVinculo()]);
  if (!usuario) return null;
  return (
    <div className="mt-auto border-t border-white/10 px-6 py-5">
      {vinculo ? <p className="truncate text-sm font-semibold">{vinculo.salao.nome}</p> : null}
      <p className="truncate text-xs text-white/55">{usuario.email}</p>
      <form action={sair} className="mt-3">
        <button
          type="submit"
          className="text-sm text-white/75 underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-white"
        >
          Sair
        </button>
      </form>
    </div>
  );
}
