import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AntecedenciaLembrete } from "@/app/_site/antecedencia-lembrete";
import { DemoAgendamento, IconeMensagem } from "@/app/_site/demo-agendamento";
import { Agenda, BOTAO, Confianca, Duvidas, Equipe, H2, Rodape } from "@/app/_site/secoes";
import { PalcoDoDia } from "./palco-do-dia";

// Versão 3 do site: escura e ousada. Topo com o dia como mostrador 3D (three.js) e o trilho
// "do link à agenda" guiado pela rolagem. Para comparar com /versoes/1 e /versoes/2.
export const metadata: Metadata = {
  title: { absolute: "AgendOn: agenda online para salões de beleza (versão 3)" },
  robots: { index: false },
};

const FOCO_CLARO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export default function Versao3() {
  return (
    <div className="bg-noite text-white">
      <Cabecalho />
      <main id="conteudo" className="flex-1">
        <Topo />
        <Trilho />
        <Experimente />
        <div className="bg-fundo text-noite">
          <Agenda />
          <Lembretes />
          <Equipe />
          <Confianca />
          <Duvidas />
        </div>
        <Chamada />
      </main>
      <div className="text-noite">
        <Rodape />
      </div>
    </div>
  );
}

function Cabecalho() {
  return (
    <header data-cabecalho-site className="sticky top-0 z-40 border-b border-white/10 bg-noite/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className={`shrink-0 rounded-md ${FOCO_CLARO}`}>
          <Image src="/logo-agendon-claro.png" alt="AgendOn" width={4092} height={1230} priority className="h-7 w-auto" />
        </Link>
        <nav aria-label="Seções" className="hidden flex-1 md:block">
          <ul className="flex gap-1 text-sm text-white/80">
            {[
              ["#trilho", "Como funciona"],
              ["#experimente", "Experimente"],
              ["#agenda", "Agenda"],
              ["#duvidas", "Dúvidas"],
            ].map(([href, texto]) => (
              <li key={href}>
                <a href={href} className={`rounded-lg px-3 py-2 hover:text-white ${FOCO_CLARO}`}>
                  {texto}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/entrar" className={`rounded-lg px-3 py-2 text-sm font-semibold hover:text-white/80 ${FOCO_CLARO}`}>
            Entrar
          </Link>
          <Link href="/cadastro" className={`${BOTAO} h-10 bg-on px-4 text-sm whitespace-nowrap text-white hover:bg-[#2249e0]`}>
            Cadastrar salão
          </Link>
        </div>
      </div>
    </header>
  );
}

function Topo() {
  return (
    <section aria-labelledby="titulo" className="relative overflow-hidden">
      {/* Linhas finas de agenda ao fundo. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:100%_3.25rem]"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-6 px-4 pt-10 pb-20 sm:px-6 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[1fr_1fr] lg:gap-4 lg:pt-6 lg:pb-16">
        <div className="relative z-10 order-2 lg:order-1">
          <h1 id="titulo" className="text-[3.2rem] leading-[0.92] font-extrabold tracking-[-0.055em] sm:text-7xl lg:text-[6.4rem]">
            <span className="block">Você atende.</span>
            <span className="mt-2 block font-extralight tracking-[-0.06em] text-white/90">A agenda enche sozinha.</span>
          </h1>
          <p className="mt-8 max-w-[29rem] text-lg leading-relaxed text-white/85">
            Seus clientes marcam pelo link do salão, a confirmação e o lembrete saem no WhatsApp e cada horário cai na sua
            agenda. Sem largar a tesoura.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/cadastro" className={`${BOTAO} h-14 bg-on px-7 text-base text-white shadow-[0_10px_40px_-8px_rgb(47_91_255/0.9)] hover:bg-[#3d67ff] ${FOCO_CLARO}`}>
              Cadastrar meu salão
            </Link>
            <a href="#experimente" className={`${BOTAO} h-14 px-7 text-base text-white ring-1 ring-white/30 hover:bg-white/10 ${FOCO_CLARO}`}>
              Marcar um horário de teste
            </a>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <PalcoDoDia />
        </div>
      </div>
    </section>
  );
}

function Trilho() {
  const paineis = [
    {
      titulo: "O link vai na bio",
      texto: "Cada salão tem a própria página, com logo, endereço e “Como chegar”. Coloque no Instagram, no WhatsApp, no cartão.",
      peca: (
        <div className="rounded-3xl bg-white p-5 text-noite">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full bg-on text-sm font-bold text-white">SB</span>
            <div>
              <p className="font-semibold">studiobelavida</p>
              <p className="text-sm text-noite/70">Cabelo, unhas e barba em Cajamar</p>
            </div>
          </div>
          <p className="mt-4 rounded-xl bg-[#EAF0FF] px-3.5 py-2.5 text-sm font-semibold text-on">agendon.app.br/studio-bela-vida</p>
        </div>
      ),
    },
    {
      titulo: "O cliente escolhe o horário",
      texto: "Só aparecem horários livres. Ele escolhe o profissional ou “qualquer um”, informa nome e WhatsApp e pronto.",
      peca: (
        <div className="grid grid-cols-3 gap-2 rounded-3xl bg-white p-5 text-noite">
          {["09:30", "10:00", "10:30", "11:00", "14:00", "14:30"].map((h) => (
            <span
              key={h}
              className={`grid h-11 place-items-center rounded-xl text-sm tabular-nums ${h === "10:30" ? "bg-on font-semibold text-white" : "ring-1 ring-noite/12"}`}
            >
              {h}
            </span>
          ))}
        </div>
      ),
    },
    {
      titulo: "O WhatsApp confirma",
      texto: "Quem autorizou recebe a confirmação na hora e um lembrete antes, pela plataforma oficial do WhatsApp.",
      peca: (
        <figure className="rounded-3xl rounded-tl-md bg-white p-5 text-noite">
          <figcaption className="flex items-center gap-1.5 text-xs font-semibold text-confirmado-escuro">
            <IconeMensagem />
            WhatsApp
          </figcaption>
          <p className="mt-2 leading-relaxed">
            Olá, Marina! Seu horário no Studio Bela Vida está confirmado: Corte feminino com Ana Lima, qua, 11 às 10:30.
          </p>
        </figure>
      ),
    },
    {
      titulo: "E cai na sua agenda",
      texto: "Na coluna do profissional, no horário certo. Dois clientes no mesmo horário, nunca.",
      peca: (
        <div className="rounded-3xl bg-white p-5 text-noite">
          <div className="grid grid-cols-[3rem_1fr] gap-y-1 text-sm">
            {["10:00", "10:30", "11:00"].map((h) => (
              <div key={h} className="contents">
                <span className="pt-2 text-noite/65 tabular-nums">{h}</span>
                {h === "10:30" ? (
                  <span className="rounded-lg border-l-4 border-confirmado bg-[#E3F8EF] px-3 py-2">
                    <strong className="font-semibold">Marina</strong> Corte feminino
                  </span>
                ) : (
                  <span className="border-t border-noite/10" />
                )}
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="trilho" aria-labelledby="titulo-trilho" className="trilho relative border-t border-white/10">
      <div className="trilho-palco py-20 lg:py-0">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <h2 id="titulo-trilho" className={H2}>
            Do link na bio à cadeira do salão.
          </h2>
          <div aria-hidden className="mt-6 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div className="trilho-barra h-full w-full rounded-full bg-on" />
          </div>
        </div>
        <ol className="trilho-faixa mx-auto mt-12 grid max-w-6xl gap-6 px-4 sm:px-6 lg:mt-14 lg:gap-8 lg:pr-[12vw] lg:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]">
          {paineis.map((p, i) => (
            <li key={p.titulo} className="trilho-painel grid gap-6 rounded-[2rem] bg-white/[0.06] p-6 ring-1 ring-white/10 sm:grid-cols-[1fr_1.1fr] sm:items-center sm:p-8">
              <div>
                <span aria-hidden className="block text-[5.5rem] leading-[0.8] font-extralight tracking-[-0.06em] text-on">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-2xl font-bold tracking-[-0.02em]">{p.titulo}</h3>
                <p className="mt-2 leading-relaxed text-white/80">{p.texto}</p>
              </div>
              {p.peca}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Experimente() {
  return (
    <section id="experimente" aria-labelledby="titulo-experimente" className="relative overflow-hidden border-t border-white/10">
      <div aria-hidden className="pointer-events-none absolute top-1/2 left-[62%] size-[46rem] -translate-1/2 rounded-full bg-on/30 blur-[120px]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1fr] lg:py-32">
        <div>
          <h2 id="titulo-experimente" className={H2}>
            Agora é você o cliente.
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-white/85">
            Escolha um horário e confirme. É exatamente o que seu cliente vê: sem baixar aplicativo, sem criar senha, sem
            esperar resposta.
          </p>
        </div>
        <DemoAgendamento fundoEscuro />
      </div>
    </section>
  );
}

function Lembretes() {
  return (
    <section id="lembretes" aria-labelledby="titulo-lembretes" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <h2 id="titulo-lembretes" className={H2}>
          Menos falta, sem você digitar nada.
        </h2>
        <p className="text-lg leading-relaxed text-noite/75">
          A confirmação sai na hora e o lembrete, antes do horário. Só recebe quem autorizou; quem responde SAIR para de
          receber.
        </p>
      </div>
      <div className="mt-12 rounded-[2.5rem] bg-[#E8ECF6] p-5 sm:p-10">
        <AntecedenciaLembrete />
      </div>
    </section>
  );
}

function Chamada() {
  return (
    <section aria-labelledby="titulo-chamada" className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -bottom-40 left-1/2 h-[30rem] w-[70rem] -translate-x-1/2 rounded-full bg-on/40 blur-[120px]" />
      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
        <h2 id="titulo-chamada" className={`max-w-3xl ${H2}`}>
          Seu salão recebendo agendamentos ainda hoje.
        </h2>
        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <Link href="/cadastro" className={`${BOTAO} h-14 bg-on px-7 text-base text-white hover:bg-[#3d67ff] ${FOCO_CLARO}`}>
            Cadastrar meu salão
          </Link>
          <p className="text-white/85">Salão, serviços e equipe em poucos minutos.</p>
        </div>
      </div>
    </section>
  );
}
