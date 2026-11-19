import type { Metadata } from "next";
import Link from "next/link";
import { DemoAgendamento, IconeMensagem } from "@/app/_site/demo-agendamento";
import { Agenda, BOTAO, BOTAO_PRIMARIO, Cabecalho, Check, Confianca, Duvidas, Equipe, H2, Rodape } from "@/app/_site/secoes";

// Versão 1 do site: clara, com o celular de teste no topo. Para comparar com /versoes/2 e /versoes/3.
export const metadata: Metadata = {
  title: { absolute: "AgendOn: agenda online para salões de beleza (versão 1)" },
  robots: { index: false },
};

const BOTAO_SECUNDARIO = `${BOTAO} border border-noite/15 bg-white text-noite hover:bg-fundo`;

export default function Versao1() {
  return (
    <>
      <Cabecalho />
      <main id="conteudo" className="flex-1">
        <Topo />
        <ComoFunciona />
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
    <section aria-labelledby="titulo" className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:gap-12 lg:pt-20 lg:pb-28">
      <div>
        <h1 id="titulo" className="text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-6xl lg:text-[3.6rem]">
          A agenda do seu salão aberta enquanto você atende.
        </h1>
        <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-noite/75">
          O cliente escolhe o serviço, o profissional e o horário pelo link do salão. A confirmação e o lembrete chegam no
          WhatsApp dele, e o horário já aparece na sua agenda.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/cadastro" className={BOTAO_PRIMARIO}>
            Cadastrar meu salão
          </Link>
          <a href="#como-funciona" className={BOTAO_SECUNDARIO}>
            Ver como funciona
          </a>
        </div>
        <ul className="mt-10 grid gap-3 text-sm text-noite/75 sm:grid-cols-3 sm:gap-4">
          {["Cliente não precisa baixar app", "Funciona no celular e no computador", "Para salões e autônomos"].map((t) => (
            <li key={t} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-confirmado-escuro" />
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="relative rounded-[2.5rem] bg-on px-5 py-10 sm:px-10 lg:py-12">
        <DemoAgendamento fundoEscuro />
      </div>
    </section>
  );
}

function ComoFunciona() {
  const passos = [
    ["Cadastre serviços e equipe", "Nome, duração e preço de cada serviço. Para cada profissional, os serviços que faz, o horário da semana, o intervalo e as folgas."],
    ["Divulgue o seu link", "Cada salão tem uma página própria, com logo, endereço e “Como chegar”. Coloque o link na bio do Instagram e no WhatsApp."],
    ["O cliente marca sozinho", "Ele vê só os horários livres, escolhe o profissional ou “qualquer um” e informa nome e WhatsApp. Nada de conversa de vai e volta."],
    ["O WhatsApp avisa por você", "Quem autorizou recebe a confirmação na hora e um lembrete antes do horário. Você não precisa mandar mensagem na mão."],
  ];
  return (
    <section id="como-funciona" aria-labelledby="titulo-como" className="border-t border-noite/8 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <h2 id="titulo-como" className={`max-w-2xl ${H2}`}>
          Do link no Instagram ao lembrete no WhatsApp.
        </h2>
        <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {passos.map(([titulo, texto], i) => (
            <li key={titulo} className="border-t-2 border-noite/10 pt-6 first:border-on">
              <span aria-hidden className="text-sm font-semibold text-on tabular-nums">
                {i + 1}
              </span>
              <h3 className="mt-2 text-lg font-semibold">{titulo}</h3>
              <p className="mt-2 leading-relaxed text-noite/70">{texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Lembretes() {
  return (
    <section id="lembretes" aria-labelledby="titulo-lembretes" className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
      <div className="order-2 lg:order-1">
        <div className="rounded-3xl bg-[#E8ECF6] p-5 sm:p-8">
          <Mensagem titulo="Logo depois de marcar">
            Olá, Marina! Seu horário no Studio Bela Vida está confirmado: Corte feminino com Ana Lima, qua, 11 às 10:30. Se
            precisar mudar ou cancelar, fale com o salão. Até breve!
          </Mensagem>
          <Mensagem titulo="24 horas antes" className="mt-4 sm:ml-10">
            Olá, Marina! Passando para lembrar do seu horário no Studio Bela Vida: Corte feminino com Ana Lima, qua, 11 às
            10:30. Se precisar mudar ou cancelar, fale com o salão. Até lá!
          </Mensagem>
        </div>
      </div>
      <div className="order-1 lg:order-2">
        <h2 id="titulo-lembretes" className={H2}>
          Confirmação e lembrete sem você digitar nada.
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-noite/75">
          As mensagens saem pela plataforma oficial do WhatsApp, com textos aprovados pela Meta e o nome do seu salão.
        </p>
        <p className="mt-8 text-sm font-medium text-noite/75">Você escolhe quando sai o lembrete</p>
        <ul aria-label="Antecedência do lembrete" className="mt-3 flex flex-wrap gap-2">
          {["2 h", "4 h", "12 h", "24 h", "48 h", "Desligado"].map((a) => (
            <li
              key={a}
              className={`rounded-full px-3.5 py-1.5 text-sm ${a === "24 h" ? "bg-noite font-semibold text-white" : "bg-white text-noite/75 ring-1 ring-noite/10"}`}
            >
              {a}
              {a === "24 h" && <span className="sr-only"> (padrão)</span>}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm leading-relaxed text-noite/70">
          Só recebe mensagem quem marcou a caixa autorizando. Se o cliente responder SAIR, as mensagens param.
        </p>
      </div>
    </section>
  );
}

function Mensagem({ titulo, children, className = "" }: { titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <figure className={`max-w-md rounded-2xl rounded-tl-sm bg-white p-4 shadow-sm ${className}`}>
      <figcaption className="flex items-center gap-1.5 text-xs font-semibold text-confirmado-escuro">
        <IconeMensagem />
        {titulo}
      </figcaption>
      <p className="mt-2 text-[0.95rem] leading-relaxed">{children}</p>
    </figure>
  );
}

function Chamada() {
  return (
    <section aria-labelledby="titulo-chamada" className="px-4 py-20 sm:px-6 lg:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 rounded-[2.5rem] bg-on px-6 py-12 text-white sm:px-12 sm:py-16">
        <div>
          <h2 id="titulo-chamada" className={H2}>
            Seu salão recebendo agendamentos ainda hoje.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-white/85">
            Cadastre o salão, os serviços e a equipe em poucos minutos. Depois é só divulgar o link.
          </p>
          <Link href="/cadastro" className={`${BOTAO} mt-8 bg-white text-on hover:bg-white/90 focus-visible:outline-white`}>
            Cadastrar meu salão
          </Link>
        </div>
      </div>
    </section>
  );
}
