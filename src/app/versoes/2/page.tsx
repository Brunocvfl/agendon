import type { Metadata } from "next";
import Link from "next/link";
import { AntecedenciaLembrete } from "@/app/_site/antecedencia-lembrete";
import { DemoAgendamento } from "@/app/_site/demo-agendamento";
import { DiaPreenchendo } from "@/app/_site/dia-preenchendo";
import { Agenda, BOTAO, Cabecalho, Confianca, Duvidas, Equipe, H2, Rodape } from "@/app/_site/secoes";

// Site do AgendOn (página inicial). Só fala do que já existe no produto.
// O rodapé com razão social e CNPJ precisa ficar: a Meta confere o nome de exibição do WhatsApp com o site.

export const metadata: Metadata = {
  title: { absolute: "AgendOn: agenda online para salões de beleza" },
  description:
    "Seus clientes marcam pelo link do salão e recebem confirmação e lembrete no WhatsApp. Agenda por profissional, clientes com histórico e acesso para toda a equipe.",
  openGraph: {
    title: "AgendOn: agenda online para salões de beleza",
    description: "Seus clientes marcam pelo link do salão e recebem confirmação e lembrete no WhatsApp.",
    url: "https://agendon.app.br",
    siteName: "AgendOn",
    locale: "pt_BR",
    type: "website",
  },
};


export default function Home() {
  return (
    <>
      <Cabecalho />
      <main id="conteudo" className="flex-1">
        <Topo />
        <Experimente />
        <Agenda />
        <Lembretes />
        <Equipe />
        <Confianca />
        <Duvidas />
        <Chamada />
      </main>
      <Rodape />
    </>
  );
}

function Topo() {
  return (
    <section aria-labelledby="titulo" className="relative overflow-hidden bg-on text-white">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.12fr_1fr] lg:gap-14 lg:pt-24 lg:pb-24">
        <div className="lg:pt-6">
          <h1
            id="titulo"
            className="text-[2.9rem] leading-[0.98] font-bold tracking-[-0.045em] text-balance sm:text-7xl lg:text-[4.6rem]"
          >
            A agenda do seu salão aberta enquanto você atende.
          </h1>
          <p className="mt-7 max-w-[30rem] text-lg leading-relaxed text-white/90">
            O cliente marca pelo link, recebe a confirmação no WhatsApp e o horário entra na sua agenda. Sem você largar a
            tesoura para responder mensagem.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/cadastro" className={`${BOTAO} bg-white text-on hover:bg-white/90 focus-visible:outline-white`}>
              Cadastrar meu salão
            </Link>
            <a href="#experimente" className={`${BOTAO} border border-white/40 text-white hover:bg-white/10 focus-visible:outline-white`}>
              Experimentar como cliente
            </a>
          </div>
        </div>
        <DiaPreenchendo />
      </div>
    </section>
  );
}

function Experimente() {
  const passos = [
    ["Cadastre serviços e equipe", "Duração e preço de cada serviço; horário, intervalo e folgas de cada profissional."],
    ["Divulgue o seu link", "Na bio do Instagram, no WhatsApp, no cartão. A página tem logo, endereço e “Como chegar”."],
    ["O cliente marca sozinho", "Vê só horários livres, escolhe o profissional ou “qualquer um” e informa nome e WhatsApp."],
  ];
  return (
    <section id="experimente" aria-labelledby="titulo-experimente" className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1fr] lg:py-32">
      <div>
        <h2 id="titulo-experimente" className={H2}>
          Seja o cliente por um minuto.
        </h2>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-noite/75">
          É assim que seu cliente marca: sem baixar aplicativo, sem criar senha, sem esperar resposta.
        </p>
        <ol className="mt-12 space-y-7">
          {passos.map(([t, d], i) => (
            <li key={t} className="grid grid-cols-[2.75rem_1fr] gap-x-4">
              <span aria-hidden className="text-[2.6rem] leading-none font-extralight tracking-[-0.05em] text-on tabular-nums">
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg font-semibold">{t}</h3>
                <p className="mt-1 leading-relaxed text-noite/70">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="relative rounded-[2.5rem] bg-[#E4E9FF] px-5 py-10 sm:px-10 lg:py-12">
        <DemoAgendamento />
      </div>
    </section>
  );
}

function Lembretes() {
  return (
    <section id="lembretes" aria-labelledby="titulo-lembretes" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <h2 id="titulo-lembretes" className={H2}>
          Menos falta, sem você digitar nada.
        </h2>
        <p className="text-lg leading-relaxed text-noite/75">
          A confirmação sai na hora e o lembrete, antes do horário, pela plataforma oficial do WhatsApp. Só recebe quem
          autorizou; quem responde SAIR para de receber.
        </p>
      </div>
      <div className="mt-14 rounded-[2.5rem] bg-[#E8ECF6] p-5 sm:p-10">
        <AntecedenciaLembrete />
      </div>
    </section>
  );
}

function Chamada() {
  return (
    <section aria-labelledby="titulo-chamada" className="bg-on text-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
        <h2 id="titulo-chamada" className={`max-w-3xl ${H2}`}>
          Seu salão recebendo agendamentos ainda hoje.
        </h2>
        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <Link href="/cadastro" className={`${BOTAO} bg-white text-on hover:bg-white/90 focus-visible:outline-white`}>
            Cadastrar meu salão
          </Link>
          <p className="text-white/90">Salão, serviços e equipe em poucos minutos.</p>
        </div>
      </div>
    </section>
  );
}

