import type { Metadata } from "next";
import { Cartao } from "@/components/ui";
import { PaginaProtegida } from "@/components/pagina-protegida";
import type { Vinculo } from "@/lib/auth";
import { urlDaLogo } from "@/lib/logo";
import { AbasConfiguracoes } from "../abas";
import { CampoLogo } from "./campo-logo";
import { carregarDadosSalao } from "./dados";
import { FormDadosSalao } from "./form-dados-salao";

export const metadata: Metadata = { title: "Dados do salão · AgendOn" };

export default function PaginaDadosSalao() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold sm:text-3xl">Configurações</h1>
      <AbasConfiguracoes ativa="Dados do salão" />
      <PaginaProtegida exige="gerenciar-salao" carregando={<Cartao className="mt-6 h-96">{null}</Cartao>}>
        {({ vinculo }) => <Conteudo vinculo={vinculo} />}
      </PaginaProtegida>
    </div>
  );
}

async function Conteudo({ vinculo }: { vinculo: Vinculo }) {
  const dados = await carregarDadosSalao(vinculo.salao.id);
  return (
    <>
      <Cartao className="mt-6">
        <h2 className="text-lg font-semibold">Identidade</h2>
        <div className="mt-4">
          <CampoLogo
            salaoId={vinculo.salao.id}
            nome={dados.nome}
            logoUrl={dados.logoPath ? urlDaLogo(dados.logoPath) : null}
          />
        </div>
      </Cartao>
      <Cartao className="mt-6">
        <FormDadosSalao inicial={dados} />
      </Cartao>
      <p className="mt-4 text-sm text-noite/65">
        Página de agendamento: <span className="font-medium text-noite">agendon.app.br/{dados.slug}</span>. A troca do
        endereço da página fica em “Link de agendamento” (em breve).
      </p>
    </>
  );
}
