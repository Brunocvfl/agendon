"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const ROTA = "/painel/notificacoes";

/**
 * Sininho do painel com o número de notificações não lidas. Na própria lista o número some (ela
 * marca tudo como lido). Com o painel aberto, um aviso que chega pelo service worker atualiza a tela.
 */
export function Sininho({ naoLidas, className = "" }: { naoLidas: number; className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const naLista = pathname?.startsWith(ROTA) ?? false;
  const numero = naLista ? 0 : naoLidas;

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const aoReceber = (e: MessageEvent) => {
      if ((e.data as { tipo?: string } | null)?.tipo === "aviso-novo") router.refresh();
    };
    navigator.serviceWorker.addEventListener("message", aoReceber);
    return () => navigator.serviceWorker.removeEventListener("message", aoReceber);
  }, [router]);

  const rotulo = numero > 0 ? `Notificações: ${numero} ${numero === 1 ? "nova" : "novas"}` : "Notificações";
  return (
    <Link
      href={ROTA}
      aria-label={rotulo}
      aria-current={naLista ? "page" : undefined}
      className={`relative flex size-10 items-center justify-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white ${naLista ? "bg-white/10 text-white" : ""} ${className}`}
    >
      <svg viewBox="0 0 20 20" className="size-5" aria-hidden fill="none">
        <path
          d="M10 2.75a5 5 0 0 0-5 5v2.6c0 .5-.17 1-.48 1.4L3.5 13.1c-.4.53-.03 1.3.64 1.3h11.72c.67 0 1.04-.77.64-1.3l-1.02-1.35a2.3 2.3 0 0 1-.48-1.4v-2.6a5 5 0 0 0-5-5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M8 16.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {numero > 0 ? (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-confirmado px-1 text-[11px] font-bold text-noite"
        >
          {numero > 99 ? "99+" : numero}
        </span>
      ) : null}
    </Link>
  );
}
