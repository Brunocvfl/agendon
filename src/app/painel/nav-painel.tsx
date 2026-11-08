"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

// Telas prontas primeiro; as que ainda vão chegar ficam agrupadas no fim, sem competir com as prontas.
const PRONTAS = [
  { href: "/painel", rotulo: "Início" },
  { href: "/painel/servicos", rotulo: "Serviços" },
  { href: "/painel/profissionais", rotulo: "Profissionais" },
];
const EM_BREVE = ["Agenda", "Clientes", "Lembretes", "Link de agendamento", "Configurações"];

const ehAtivo = (href: string, pathname: string | null) =>
  pathname !== null && (href === "/painel" ? pathname === "/painel" : pathname.startsWith(href));

// Lê a rota atual para destacar o item. Fica dentro de <Suspense> (exigência do Cache Components).
export function NavPainel() {
  return <ListaMenu pathname={usePathname()} />;
}

// Mesma lista, sem destaque: usada como fallback enquanto a rota atual não chega.
export function ListaMenu({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Menu do painel" className="flex flex-1 flex-col gap-6 px-3">
      <ul className="flex flex-col gap-1">
        {PRONTAS.map((item) => {
          const ativo = ehAtivo(item.href, pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={`block rounded-xl px-4 py-2.5 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  ativo ? "bg-on text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
      <div>
        <p className="px-4 text-xs font-medium text-white/40">Em breve</p>
        <ul className="mt-1 flex flex-col">
          {EM_BREVE.map((rotulo) => (
            <li key={rotulo} className="px-4 py-1.5 text-sm text-white/35">
              {rotulo}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

// Celular: botão "Menu" que abre uma gaveta lateral (<dialog> nativo: Esc fecha e o foco fica dentro).
export function MenuCelular({ conta }: { conta: ReactNode }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  // Fecha ao trocar de página.
  useEffect(() => {
    dialogo.current?.close();
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogo.current?.showModal()}
        aria-haspopup="dialog"
        className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
      >
        <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
          <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
        Menu
      </button>

      <dialog
        ref={dialogo}
        aria-label="Menu do painel"
        onClick={(e) => {
          // Toque no fundo escuro (fora da gaveta) fecha.
          if (e.target === dialogo.current) dialogo.current?.close();
        }}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(20rem,85vw)] max-w-none bg-noite p-0 text-white backdrop:bg-noite/60 open:flex open:flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-lg font-semibold tracking-tight">
            Agend<span className="text-on">On</span>
          </span>
          <button
            type="button"
            onClick={() => dialogo.current?.close()}
            aria-label="Fechar menu"
            className="flex size-10 items-center justify-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          >
            <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <ListaMenu pathname={pathname} />
        {conta}
      </dialog>
    </>
  );
}
