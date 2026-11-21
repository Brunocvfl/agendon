import type { Metadata } from "next";
import Link from "next/link";
import { AntecedenciaLembrete } from "@/app/_site/antecedencia-lembrete";
import { DemoAgendamento } from "@/app/_site/demo-agendamento";
import { DiaPreenchendo } from "@/app/_site/dia-preenchendo";
import { Agenda, BOTAO, Cabecalho, Check, Confianca, Duvidas, Equipe, H2, Rodape } from "@/app/_site/secoes";
import { Revelar } from "@/app/_site/revelar";
import { AvisoNovoAgendamento, MolduraCelular } from "@/app/_site/telas";

// Site do AgendOn (página inicial). Só fala do que já existe no produto. Briefing, direção, textos e auditoria em docs/site/.
// O rodapé com razão social e CNPJ precisa ficar: a Meta confere o nome de exibição do WhatsApp com o site.

export const metadata: Metadata = {
  title: { absolute: "AgendOn: agenda online para salões de beleza" },
  description:
    "Seus clientes marcam pelo link do salão e recebem a confirmação no WhatsApp. Agenda por profissional, clientes com histórico e acesso para a equipe. Teste grátis por 30 dias.",
  openGraph: {
    title: "AgendOn: agenda online para salões de beleza",
    description: "Seus clientes marcam pelo link do salão e recebem a confirmação no WhatsApp. Teste grátis por 30 dias.",
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
        <Celular />
        <Equipe />
        <Confianca />
        <TesteGratis />
        <Duvidas />
        <Chamada />
      </main>
      <Rodape />
      <Revelar />
    </>
  );
}

function Topo() {
  return (
    <section aria-labelledby="titulo" className="relative overflow-hidden bg-noite text-white">
      <div className="mx-auto grid grid-cols-1 max-w-6xl gap-12 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.12fr_1fr] lg:gap-14 lg:pt-24 lg:pb-24">
        <div className="lg:pt-6">
          <h1
            id="titulo"
            className="text-[2.9rem] leading-[0.98] font-bold tracking-[-0.045em] text-balance sm:text-7xl lg:text-[4.6rem]"
          >
            A agenda do seu salão aberta enquanto você atende.
          </h1>
          <p className="mt-7 max-w-[30rem] text-lg leading-relaxed text-white">
            O cliente marca pelo link do salão, recebe a confirmação no WhatsApp e o horário já aparece na sua agenda.
            Sem largar a tesoura para responder mensagem.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/cadastro" className={`${BOTAO} bg-on text-white hover:bg-on-escuro focus-visible:outline-white`}>
              Começar teste grátis
            </Link>
            <a href="#experimente" className={`${BOTAO} border border-white/40 text-white hover:bg-white/10 focus-visible:outline-white`}>
              Ver como o cliente marca
            </a>
          </div>
          <p className="mt-5 text-sm text-white">30 dias grátis, com até 15 profissionais.</p>
        </div>
        <DiaPreenchendo />
      </div>
    </section>
  );
}

function Experimente() {
  const passos = [
    ["Cadastre serviços e equipe", "Duração e preço de cada serviço; horário, intervalo e folgas de cada profissional."],
    ["Divulgue o seu link", "Na bio do Instagram, no status do WhatsApp, no cartão de visita. A página mostra seu logo, o endereço e o botão “Como chegar”."],
    ["O cliente marca sozinho", "Vê só os horários livres, escolhe o profissional ou “qualquer um” e informa nome e WhatsApp."],
  ];
  return (
    <section id="experimente" aria-labelledby="titulo-experimente" className="mx-auto grid grid-cols-1 max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1fr] lg:py-32">
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
      <div data-revelar className="relative rounded-[2.5rem] bg-on-claro px-5 py-10 sm:px-10 lg:py-12">
        <DemoAgendamento />
      </div>
    </section>
  );
}

function Lembretes() {
  return (
    <section id="lembretes" aria-labelledby="titulo-lembretes" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <h2 id="titulo-lembretes" className={H2}>
          Confirmação e lembrete no WhatsApp, sem você digitar nada.
        </h2>
        <p className="text-lg leading-relaxed text-noite/75">
          A confirmação sai assim que o cliente marca. O lembrete chega antes do horário, na antecedência que você
          escolher. Tudo pela plataforma oficial do WhatsApp e só para quem autorizou; quem responde SAIR deixa de
          receber.
        </p>
      </div>
      <div data-revelar className="mt-14 rounded-[2.5rem] bg-[#E8ECF6] p-5 sm:p-10">
        <AntecedenciaLembrete />
      </div>
    </section>
  );
}

function Celular() {
  return (
    <section aria-labelledby="titulo-celular" className="overflow-hidden bg-on-claro">
      <div className="mx-auto grid grid-cols-1 max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-28">
        <div>
          <h2 id="titulo-celular" className={H2}>
            Agendamento novo avisa no seu celular.
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-noite/75">
            Instale o painel na tela inicial do celular, direto pelo navegador, sem loja de aplicativos. Quando um
            cliente marca pelo link, chega um aviso com o nome e o serviço.
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-noite/70">
            No iPhone, o aviso funciona com o AgendOn adicionado à tela de início.
          </p>
        </div>
        <div data-revelar>
          {/* Celular: o aviso fica acima dos aparelhos (por cima deles não caberia). */}
          <AvisoNovoAgendamento className="mx-auto mb-8 w-full max-w-[20rem] sm:hidden motion-safe:animate-chegar motion-safe:[animation-delay:0.6s] motion-safe:[animation-fill-mode:backwards]" />
          <div className="grid grid-cols-2 items-start gap-4 sm:gap-8">
            <MolduraCelular
              src="/site/pagina-publica-celular.webp"
              alt="Página de agendamento do Studio Bela Vida no celular: endereço, “Como chegar” e a lista de serviços com duração e preço."
              sizes="(min-width: 1024px) 17.5rem, 45vw"
              className="mt-12"
            >
              <figcaption className="mt-4 text-center text-sm font-semibold text-noite/75">O que o cliente vê</figcaption>
            </MolduraCelular>
            <MolduraCelular
              src="/site/agenda-celular.webp"
              alt="Agenda do dia da profissional Ana Lima no painel, aberta no celular, com os horários de Marina, Juliana, Fernanda e Patrícia."
              sizes="(min-width: 1024px) 17.5rem, 45vw"
            >
              <AvisoNovoAgendamento className="absolute top-16 left-1/2 hidden -translate-x-1/2 sm:flex motion-safe:animate-chegar motion-safe:[animation-delay:0.8s] motion-safe:[animation-fill-mode:backwards]" />
              <figcaption className="mt-4 text-center text-sm font-semibold text-noite/75">O que você vê</figcaption>
            </MolduraCelular>
          </div>
        </div>
      </div>
    </section>
  );
}

function TesteGratis() {
  const itens = [
    "Página de agendamento com o seu link",
    "Agenda, clientes e equipe completos",
    "Até 15 profissionais com agenda",
    "Até 10 confirmações no WhatsApp",
  ];
  return (
    <section id="teste-gratis" aria-labelledby="titulo-teste" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:pb-28">
      <div data-revelar className="mx-auto max-w-3xl rounded-[2.5rem] bg-white p-8 ring-2 ring-on sm:p-12">
        <h2 id="titulo-teste" className="text-3xl leading-[1.05] font-bold tracking-[-0.03em] text-balance sm:text-[2.5rem]">
          Teste por 30 dias com o seu salão de verdade.
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {itens.map((t) => (
            <li key={t} className="flex gap-3">
              <Check className="mt-0.5 size-5 shrink-0 text-confirmado-escuro" />
              <span className="leading-relaxed">{t}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 leading-relaxed text-noite/70">
          Se você não escolher um plano ao fim do teste, a página de agendamento deixa de aceitar horários e as
          mensagens param. O painel continua funcionando e seus dados ficam lá.
        </p>
        <Link href="/cadastro" className={`${BOTAO} mt-8 bg-on text-white hover:bg-on-escuro`}>
          Começar teste grátis
        </Link>
      </div>
    </section>
  );
}

function Chamada() {
  return (
    <section aria-labelledby="titulo-chamada" className="bg-noite text-white">
      <div className="mx-auto grid grid-cols-1 max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1fr] lg:py-32">
        <div>
          <h2 id="titulo-chamada" className={`max-w-3xl ${H2}`}>
            Seu link de agendamento no ar ainda hoje.
          </h2>
          <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <Link href="/cadastro" className={`${BOTAO} shrink-0 bg-on text-white hover:bg-on-escuro focus-visible:outline-white`}>
              Começar teste grátis
            </Link>
            <p className="text-white">Cadastre o salão, os serviços e a equipe, e divulgue o link.</p>
          </div>
        </div>
        <div data-revelar>
          <DiaPreenchendo variante="cheio" />
        </div>
      </div>
    </section>
  );
}
