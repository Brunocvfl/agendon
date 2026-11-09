"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** Escolha do profissional da agenda: troca a URL ao mudar (sem botão). `hrefs` tem a URL de cada opção. */
export function FiltroProfissional({
  opcoes,
  valor,
}: {
  opcoes: { valor: string; rotulo: string; href: string }[];
  valor: string;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  return (
    <>
      <label htmlFor="filtro-profissional" className="sr-only">
        Profissional
      </label>
      <select
        id="filtro-profissional"
        value={valor}
        aria-busy={pendente}
        onChange={(e) => {
          const href = opcoes.find((o) => o.valor === e.target.value)?.href;
          if (href) iniciar(() => router.push(href));
        }}
        className={`h-10 max-w-56 rounded-xl border border-noite/12 bg-white px-3 text-sm font-medium text-noite outline-none focus:border-on focus:ring-2 focus:ring-on/20 ${pendente ? "opacity-60" : ""}`}
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </>
  );
}
