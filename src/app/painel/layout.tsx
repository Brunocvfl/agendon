import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getUsuario, getVinculo } from "@/lib/auth";
import { sair } from "@/app/(acesso)/actions";
import { ListaMenu, NavPainel } from "./nav-painel";

export default function LayoutPainel({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="bg-noite text-white md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:shrink-0 md:flex-col">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-6 md:py-6">
          <Link href="/painel" className="flex items-center gap-2.5">
            <Image src="/simbolo-agendon.png" alt="" width={2048} height={2048} className="size-9 rounded-lg" />
            <span className="text-xl font-semibold tracking-tight">
              Agend<span className="text-on">On</span>
            </span>
          </Link>
        </div>
        <Suspense fallback={<ListaMenu pathname={null} />}>
          <NavPainel />
        </Suspense>
        <Suspense fallback={null}>
          <Conta />
        </Suspense>
      </aside>
      <div className="flex-1 px-4 py-6 sm:px-8 sm:py-10">{children}</div>
    </div>
  );
}

async function Conta() {
  const [usuario, vinculo] = await Promise.all([getUsuario(), getVinculo()]);
  if (!usuario) return null;
  return (
    <div className="hidden border-t border-white/10 px-6 py-5 md:block">
      {vinculo ? <p className="truncate text-sm font-semibold">{vinculo.salao.nome}</p> : null}
      <p className="truncate text-xs text-white/55">{usuario.email}</p>
      <form action={sair} className="mt-3">
        <button type="submit" className="text-sm text-white/75 underline-offset-4 hover:text-white hover:underline">
          Sair
        </button>
      </form>
    </div>
  );
}
