// Seções comuns às versões do site (/versoes/1, 2 e 3) e constantes de estilo.
// Logo do site: logo-agendon-site.png é o logo-agendon.png sem a margem transparente (sharp trim, 1200 px).
// O rodapé com razão social e CNPJ precisa ficar: a Meta confere o nome de exibição do WhatsApp com o site.
import Image from "next/image";
import Link from "next/link";
import { EMAIL_LEGAL, EMPRESA, WHATSAPP_ENVIO } from "@/lib/legal";
import { AgendaIlustrada } from "./agenda-ilustrada";

export const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on";
export const BOTAO =
  "inline-flex h-12 items-center justify-center rounded-xl px-6 text-[0.95rem] font-semibold transition-colors " + FOCO;
export const BOTAO_PRIMARIO = `${BOTAO} bg-on text-white hover:bg-[#2249e0]`;
export const H2 = "text-4xl leading-[1.02] font-bold tracking-[-0.04em] text-balance sm:text-5xl lg:text-[3.6rem]";

export function Cabecalho() {
  return (
    <header data-cabecalho-site className="sticky top-0 z-40 border-b border-noite/8 bg-fundo/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Link href="/" className={`shrink-0 rounded-md ${FOCO}`}>
          <Image src="/logo-agendon-site.png" alt="AgendOn" width={1200} height={241} priority className="h-6 w-auto sm:h-9" />
        </Link>
        <nav aria-label="Seções" className="hidden flex-1 md:block">
          <ul className="flex gap-1 text-sm text-noite/75">
            {[
              ["/#experimente", "Como funciona"],
              ["/#agenda", "Agenda"],
              ["/#lembretes", "Lembretes"],
              ["/#duvidas", "Dúvidas"],
              ["/contato", "Sobre"],
            ].map(([href, texto]) => (
              <li key={href}>
                <a href={href} className={`rounded-lg px-3 py-2 hover:text-on ${FOCO}`}>
                  {texto}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/entrar" className={`rounded-lg px-2 py-2 text-sm sm:px-3 font-semibold hover:text-on ${FOCO}`}>
            Entrar
          </Link>
          <Link href="/cadastro" className={`inline-flex h-10 items-center rounded-xl bg-on px-3 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-[#2249e0] sm:px-4 ${FOCO}`}>
            Cadastrar salão
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Agenda() {
  const itens = [
    ["Dia e semana", "Uma coluna por profissional no dia, ou a semana inteira de uma pessoa, com expediente, intervalo e folgas."],
    ["Encaixe com aviso", "Agende pelo painel até fora do expediente, com confirmação. Dois clientes no mesmo horário, nunca."],
    ["Status de cada atendimento", "Agendado, confirmado, concluído ou faltou. Falta e cancelamento liberam o horário na hora."],
    ["Valores do dia", "O dono vê o previsto, o confirmado e quanto se perdeu com faltas."],
  ];
  return (
    <section id="agenda" aria-labelledby="titulo-agenda" className="bg-noite text-white">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:py-28">
        <div>
          <h2 id="titulo-agenda" className={`${H2}`}>
            O dia do salão inteiro numa tela só.
          </h2>
          <dl className="mt-10 space-y-6">
            {itens.map(([t, d]) => (
              <div key={t}>
                <dt className="font-semibold">{t}</dt>
                <dd className="mt-1 leading-relaxed text-white/75">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
        <AgendaIlustrada />
      </div>
    </section>
  );
}

export function Equipe() {
  const linhas: [string, boolean, boolean, string | boolean][] = [
    ["Ver a agenda", true, true, "Só a própria"],
    ["Agendar, remarcar e mudar status", true, true, "Só na própria"],
    ["Ver clientes, histórico e telefone", true, true, false],
    ["Editar horários e folgas", true, true, false],
    ["Ver valores da agenda", true, false, false],
    ["Editar serviços, preços e lembretes", true, false, false],
    ["Convidar e remover pessoas da equipe", true, false, false],
  ];
  return (
    <section aria-labelledby="titulo-equipe" className="border-y border-noite/8 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
          <h2 id="titulo-equipe" className={`${H2}`}>
            Cada pessoa da equipe vê o que precisa.
          </h2>
          <p className="text-lg leading-relaxed text-noite/75">
            Convide por e-mail quem trabalha com você. O profissional vê a própria agenda com o nome do cliente, mas não o
            telefone.
          </p>
        </div>
        <div className="relative mt-12 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <caption className="sr-only">O que cada perfil pode fazer</caption>
            <thead>
              <tr className="border-b-2 border-noite">
                <th scope="col" className="py-3 pr-4 font-semibold">
                  <span className="sr-only">Permissão</span>
                </th>
                {["Dono(a)", "Recepção", "Profissional"].map((p) => (
                  <th key={p} scope="col" className="w-36 px-2 py-3 text-center font-semibold">
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map(([permissao, ...valores]) => (
                <tr key={permissao} className="border-b border-noite/10">
                  <th scope="row" className="py-3.5 pr-4 font-normal text-noite/85">
                    {permissao}
                  </th>
                  {valores.map((v, i) => (
                    <td key={i} className="px-2 py-3.5 text-center text-sm">
                      {v === true ? (
                        <>
                          <Check className="mx-auto size-5 text-confirmado-escuro" />
                          <span className="sr-only">Sim</span>
                        </>
                      ) : v === false ? (
                        <>
                          <span aria-hidden className="text-noite/30">
                            –
                          </span>
                          <span className="sr-only">Não</span>
                        </>
                      ) : (
                        <span className="text-noite/75">{v}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function Confianca() {
  const itens = [
    ["Dados guardados no Brasil", "O banco de dados fica em São Paulo, com acesso separado por salão: um salão nunca vê os dados de outro."],
    ["De acordo com a LGPD", "O salão baixa os dados de um cliente quando ele pede, ou apaga a identificação dele, mantendo o histórico sem nome."],
    ["Nada de CPF nem foto do cliente", "Para marcar, só nome e WhatsApp. Quem fica 24 meses sem agendar tem a identificação apagada automaticamente."],
    ["Sem horário duplicado", "O sistema não deixa dois agendamentos no mesmo horário do mesmo profissional, nem quando dois clientes tentam ao mesmo tempo."],
  ];
  return (
    <section aria-labelledby="titulo-confianca" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
      <h2 id="titulo-confianca" className={`max-w-2xl ${H2}`}>
        Os dados dos seus clientes, bem cuidados.
      </h2>
      <dl className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
        {itens.map(([t, d]) => (
          <div key={t} className="flex gap-4">
            <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full bg-on" />
            <div>
              <dt className="text-lg font-semibold">{t}</dt>
              <dd className="mt-1.5 leading-relaxed text-noite/70">{d}</dd>
            </div>
          </div>
        ))}
      </dl>
      <p className="mt-12 text-sm text-noite/70">
        Detalhes na{" "}
        <Link href="/privacidade" className={`font-semibold text-on underline-offset-4 hover:underline ${FOCO}`}>
          Política de Privacidade
        </Link>{" "}
        e nos{" "}
        <Link href="/termos" className={`font-semibold text-on underline-offset-4 hover:underline ${FOCO}`}>
          Termos de Uso
        </Link>
        .
      </p>
    </section>
  );
}

export function Duvidas() {
  const perguntas = [
    ["O cliente precisa baixar algum aplicativo?", "Não. Ele abre o link do salão no navegador do celular, escolhe e confirma. Não precisa criar conta nem senha."],
    [
      "Preciso ter WhatsApp Business ou configurar alguma coisa?",
      "Não. A confirmação e o lembrete saem pelo número oficial do AgendOn, com o nome do seu salão na mensagem. Você só escolhe a antecedência do lembrete.",
    ],
    ["Serve para quem trabalha sozinho?", "Sim. Cadastre você mesmo como profissional (opção “Sou eu”) e a sua agenda fica pronta. Se a equipe crescer, é só convidar."],
    [
      "O cliente pode marcar com um profissional específico?",
      "Pode escolher o profissional ou “qualquer um”. Nesse caso, o AgendOn escolhe quem tem menos agendamentos no dia.",
    ],
    ["Consigo agendar quem liga ou chega no balcão?", "Sim. Pelo painel você busca o cliente pelo nome ou cadastra um novo e escolhe um horário livre. Se ele já autorizou as mensagens, também recebe a confirmação."],
    ["Dá para usar no celular?", "Sim. O painel funciona no celular e pode ser instalado como aplicativo na tela inicial, direto pelo navegador."],
  ];
  return (
    <section id="duvidas" aria-labelledby="titulo-duvidas" className="border-t border-noite/8 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:py-28">
        <h2 id="titulo-duvidas" className={`${H2}`}>
          Dúvidas
        </h2>
        <div className="divide-y divide-noite/10 border-y border-noite/10">
          {perguntas.map(([p, r]) => (
            <details key={p} className="group">
              <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold [&::-webkit-details-marker]:hidden ${FOCO}`}>
                {p}
                <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0 text-on transition-transform group-open:rotate-45" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </summary>
              <p className="max-w-[60ch] pb-6 leading-relaxed text-noite/75">{r}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Rodape() {
  return (
    <footer className="border-t border-noite/8 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <Image src="/logo-agendon-site.png" alt="AgendOn" width={1200} height={241} className="h-10 w-auto" />
          <p className="mt-4 text-sm leading-relaxed text-noite/70">Agenda online e lembretes no WhatsApp para salões de beleza.</p>
        </div>
        <nav aria-label="Rodapé">
          <ul className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm text-noite/75">
            <li>
              <Link href="/cadastro" className={`hover:text-on ${FOCO}`}>
                Cadastrar salão
              </Link>
            </li>
            <li>
              <Link href="/termos" className={`hover:text-on ${FOCO}`}>
                Termos de Uso
              </Link>
            </li>
            <li>
              <Link href="/entrar" className={`hover:text-on ${FOCO}`}>
                Entrar
              </Link>
            </li>
            <li>
              <Link href="/privacidade" className={`hover:text-on ${FOCO}`}>
                Privacidade
              </Link>
            </li>
            <li>
              <Link href="/contato" className={`hover:text-on ${FOCO}`}>
                Sobre e contato
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      {/* Quem está por trás da marca: a Meta confere o nome de exibição do WhatsApp com o site. */}
      <div className="border-t border-noite/8">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-noite/65 sm:px-6">
          AgendOn é um serviço de {EMPRESA.nome}, {EMPRESA.documento}, {EMPRESA.cidade}. Contato:{" "}
          <a href={`mailto:${EMAIL_LEGAL}`} className={`underline-offset-2 hover:text-on hover:underline ${FOCO}`}>
            {EMAIL_LEGAL}
          </a>
          . WhatsApp das confirmações e lembretes: {WHATSAPP_ENVIO.exibicao}.
        </p>
      </div>
    </footer>
  );
}

export function Check({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}
