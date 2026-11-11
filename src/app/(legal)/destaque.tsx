import type { ReactNode } from "react";

// Caixas das páginas legais. "Resumo" abre o documento em linguagem simples;
// "Destaque" chama atenção para cláusulas que limitam direitos (CDC, art. 54, § 4º): nada de letra miúda.
export function Resumo({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Resumo"
      className="mt-6 rounded-xl bg-fundo p-5 [&_li]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5"
    >
      <p className="!mt-0 font-semibold text-noite">Resumo em linguagem simples</p>
      {children}
    </section>
  );
}

export function Destaque({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-r-xl border-l-4 border-on bg-on/5 py-3 pl-4 pr-4 font-medium text-noite [&>p:first-child]:!mt-0">
      {children}
    </div>
  );
}
