// Página protegida do painel: o esqueleto que toda página repete, num lugar só.
// - <Suspense> em volta do que lê a sessão (exigência do Cache Components);
// - exige o vínculo (e a permissão, se pedida), mandando para `senao` quem não pode;
// - com `params`, valida o id da rota (não-UUID vira 404 antes de ir ao banco).
// O conteúdo recebe o vínculo e o id prontos. A RLS continua sendo a garantia final.
import { Suspense, type ReactNode } from "react";
import { notFound } from "next/navigation";
import { exigirPermissao, exigirVinculo, type Permissao, type Vinculo } from "@/lib/auth";
import { ehUuid } from "@/lib/ids";

export type ContextoPagina = { vinculo: Vinculo; id: string };

type Props = {
  exige?: Permissao;
  senao?: string;
  params?: Promise<{ id: string }>;
  carregando?: ReactNode;
  children: (ctx: ContextoPagina) => ReactNode;
};

export function PaginaProtegida({ carregando, ...props }: Props) {
  return (
    <Suspense fallback={carregando ?? <p className="text-sm text-noite/60">Carregando…</p>}>
      <Protegida {...props} />
    </Suspense>
  );
}

async function Protegida({ exige, senao, params, children }: Omit<Props, "carregando">) {
  const vinculo = exige ? await exigirPermissao(exige, senao) : await exigirVinculo();
  let id = "";
  if (params) {
    ({ id } = await params);
    if (!ehUuid(id)) notFound();
  }
  return children({ vinculo, id });
}
