import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getUsuario, getVinculo } from "@/lib/auth";
import { sair } from "@/app/(acesso)/actions";

// Itens do wireframe; os que ainda não existem aparecem como "em breve".
const MENU = [
  { href: "/painel", rotulo: "Início", pronto: true },
  { href: "/painel/agenda", rotulo: "Agenda", pronto: false },
  { href: "/painel/clientes", rotulo: "Clientes", pronto: false },
  { href: "/painel/servicos", rotulo: "Serviços", pronto: false },
  { href: "/painel/profissionais", rotulo: "Profissionais", pronto: false },
  { href: "/painel/lembretes", rotulo: "Lembretes", pronto: false },
  { href: "/painel/link", rotulo: "Link de agendamento", pronto: false },
  { href: "/painel/configuracoes", rotulo: "Configurações", pronto: false },
];

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
        <nav aria-label="Menu do painel" className="overflow-x-auto px-2 pb-3 md:flex-1 md:px-3 md:pb-0">
          <ul className="flex gap-1 md:flex-col">
            {MENU.map((item) => (
              <li key={item.href} className="shrink-0">
                {item.pronto ? (
                  <Link
                    href={item.href}
                    className="block rounded-xl bg-on px-4 py-2.5 text-sm font-medium text-white"
                  >
                    {item.rotulo}
                  </Link>
                ) : (
                  <span
                    aria-disabled
                    className="flex items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-sm text-white/45"
                  >
                    {item.rotulo}
                    <span className="hidden rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide md:inline">
                      em breve
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
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
