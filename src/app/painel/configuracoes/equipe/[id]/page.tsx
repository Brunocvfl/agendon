import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cartao } from "@/components/ui";
import { PaginaProtegida } from "@/components/pagina-protegida";
import type { Vinculo } from "@/lib/auth";
import { formatarDiaMes } from "@/lib/formato";
import { AcaoDeAcesso } from "../acoes-acesso";
import { agendasLivres, carregarEquipe } from "../dados";
import { FormMembro } from "../form-membro";

export const metadata: Metadata = { title: "Pessoa da equipe · AgendOn" };

export default function PaginaMembro({ params }: PageProps<"/painel/configuracoes/equipe/[id]">) {
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/painel/configuracoes/equipe" className="text-sm font-medium text-on hover:underline">
        ← Equipe e acessos
      </Link>
      <PaginaProtegida exige="gerenciar-salao" params={params}>
        {({ vinculo, id }) => <Conteudo vinculo={vinculo} id={id} />}
      </PaginaProtegida>
    </div>
  );
}

async function Conteudo({ vinculo, id }: { vinculo: Vinculo; id: string }) {
  const equipe = await carregarEquipe(vinculo.salao.id);
  const m = equipe.find((x) => x.id === id);
  if (!m) notFound();
  const agendas = await agendasLivres(vinculo.salao.id, m.agenda?.id);
  const eu = m.id === vinculo.membroId;
  const data = (iso: string | null) => (iso ? formatarDiaMes(iso, vinculo.salao.fuso) : null);

  return (
    <>
      <h1 className="mt-2 break-words text-2xl font-semibold sm:text-3xl">{m.nome ?? m.email}</h1>
      <p className="mt-1 break-words text-sm text-noite/65">{m.email}</p>

      <Cartao className="mt-6">
        <FormMembro
          agendas={agendas}
          inicial={{ id: m.id, nome: m.nome ?? "", perfil: m.perfil, agenda: m.agenda?.id ?? "", eu }}
        />
      </Cartao>

      <Cartao className="mt-6">
        <h2 className="text-lg font-semibold">Acesso</h2>
        {m.status === "convidado" ? (
          <>
            <p className="mt-1 text-sm text-noite/65">
              Convite enviado{data(m.convidadoEm) ? ` em ${data(m.convidadoEm)}` : ""} e ainda não aceito. O link do e-mail vale
              por 1 hora.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <AcaoDeAcesso id={m.id} tipo="reenviar" />
              <AcaoDeAcesso id={m.id} tipo="cancelar" />
            </div>
          </>
        ) : m.status === "ativo" ? (
          <>
            <p className="mt-1 text-sm text-noite/65">
              Ativo{data(m.ultimoAcesso) ? ` · último acesso em ${data(m.ultimoAcesso)}` : ""}.
            </p>
            {eu ? (
              <p className="mt-3 text-sm text-noite/65">Você não pode desativar o seu próprio acesso.</p>
            ) : (
              <div className="mt-4">
                <AcaoDeAcesso id={m.id} tipo="desativar" />
              </div>
            )}
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-noite/65">Acesso desativado: essa pessoa não entra no painel.</p>
            <div className="mt-4">
              <AcaoDeAcesso id={m.id} tipo="reativar" />
            </div>
          </>
        )}
      </Cartao>
    </>
  );
}
