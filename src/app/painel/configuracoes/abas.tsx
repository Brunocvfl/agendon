import Link from "next/link";

// Abas de Configurações (wireframes 8 e 9). "Plano e cobrança" ainda não existe.
const ABAS = [
  { rotulo: "Dados do salão", href: "/painel/configuracoes/dados" },
  { rotulo: "Plano e cobrança", href: null },
  { rotulo: "Equipe e acessos", href: "/painel/configuracoes/equipe" },
] as const;

type Aba = (typeof ABAS)[number]["rotulo"];

export function AbasConfiguracoes({ ativa }: { ativa: Aba }) {
  return (
    <nav aria-label="Configurações" className="mt-4 overflow-x-auto border-b border-noite/10">
      <ul className="flex gap-6 whitespace-nowrap">
        {ABAS.map((a) =>
          a.href ? (
            <li key={a.rotulo}>
              <Link
                href={a.href}
                aria-current={a.rotulo === ativa ? "page" : undefined}
                className={`-mb-px block border-b-2 py-3 text-sm font-semibold ${a.rotulo === ativa ? "border-on text-on" : "border-transparent text-noite/70 hover:text-noite"}`}
              >
                {a.rotulo}
              </Link>
            </li>
          ) : (
            <li key={a.rotulo} className="py-3 text-sm text-noite/50">
              {a.rotulo} <span className="text-xs">(em breve)</span>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
