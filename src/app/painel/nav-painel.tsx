"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Itens do wireframe; os que ainda não existem aparecem como "em breve".
const MENU = [
  { href: "/painel", rotulo: "Início", pronto: true },
  { href: "/painel/agenda", rotulo: "Agenda", pronto: false },
  { href: "/painel/clientes", rotulo: "Clientes", pronto: false },
  { href: "/painel/servicos", rotulo: "Serviços", pronto: true },
  { href: "/painel/profissionais", rotulo: "Profissionais", pronto: false },
  { href: "/painel/lembretes", rotulo: "Lembretes", pronto: false },
  { href: "/painel/link", rotulo: "Link de agendamento", pronto: false },
  { href: "/painel/configuracoes", rotulo: "Configurações", pronto: false },
];

// Lê a rota atual para destacar o item. Fica dentro de <Suspense> no layout (exigência do Cache Components).
export function NavPainel() {
  return <ListaMenu pathname={usePathname()} />;
}

// Mesma lista, sem destaque: usada como fallback enquanto a rota atual não chega.
export function ListaMenu({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Menu do painel" className="overflow-x-auto px-2 pb-3 md:flex-1 md:px-3 md:pb-0">
      <ul className="flex gap-1 md:flex-col">
        {MENU.map((item) => {
          const ativo =
            pathname !== null && (item.href === "/painel" ? pathname === "/painel" : pathname.startsWith(item.href));
          if (!item.pronto) {
            return (
              <li key={item.href} className="shrink-0">
                <span
                  aria-disabled
                  className="flex items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-sm text-white/45"
                >
                  {item.rotulo}
                  <span className="hidden rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide md:inline">
                    em breve
                  </span>
                </span>
              </li>
            );
          }
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  ativo ? "bg-on text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
