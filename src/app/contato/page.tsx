import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho, FOCO, H2, Rodape } from "@/app/_site/secoes";
import { EMAIL_LEGAL, EMPRESA, SITE, WHATSAPP_ENVIO } from "@/lib/legal";

// Sobre e contato: quem está por trás da marca AgendOn.
// A Meta confere o nome de exibição do WhatsApp com esta página: marca, razão social, CNPJ e o número de envio
// precisam aparecer juntos e em texto (não em imagem).

export const metadata: Metadata = {
  title: "Sobre e contato",
  description: `AgendOn é a agenda online para salões de beleza de ${EMPRESA.nome}, ${EMPRESA.documento}, ${EMPRESA.cidade}.`,
};

const LINK = `font-semibold text-on underline-offset-4 hover:underline ${FOCO}`;

export default function Contato() {
  const dados: [string, React.ReactNode][] = [
    ["Marca", "AgendOn"],
    ["Empresa (razão social)", EMPRESA.nome],
    ["CNPJ", EMPRESA.documento.replace(/^CNPJ\s*/, "")],
    ["Cidade", EMPRESA.cidade],
    ["Site", <a key="site" href={`https://${SITE}`} className={LINK}>{SITE}</a>],
    ["E-mail", <a key="email" href={`mailto:${EMAIL_LEGAL}`} className={LINK}>{EMAIL_LEGAL}</a>],
    ["WhatsApp das mensagens", WHATSAPP_ENVIO.exibicao],
  ];

  return (
    <>
      <Cabecalho />
      <main id="conteudo" className="flex-1">
        <section aria-labelledby="titulo" className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-6 lg:pt-24">
          <h1 id="titulo" className={`max-w-3xl ${H2}`}>
            Sobre o AgendOn
          </h1>
          <div className="mt-8 max-w-[62ch] space-y-4 text-lg leading-relaxed text-noite/80">
            <p>
              O AgendOn é uma agenda online para salões de beleza e profissionais autônomos. O salão cadastra serviços,
              profissionais e horários; os clientes marcam pelo link do salão e recebem a confirmação e o lembrete no
              WhatsApp.
            </p>
            <p>
              AgendOn é a marca e o serviço de <strong className="text-noite">{EMPRESA.nome}</strong>,{" "}
              {EMPRESA.documento}, empresa sediada em {EMPRESA.cidade}, Brasil, que desenvolve e opera o sistema.
            </p>
          </div>
        </section>

        <section aria-labelledby="titulo-dados" className="border-y border-noite/8 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
            <h2 id="titulo-dados" className="text-3xl font-bold tracking-[-0.03em]">
              Dados da empresa
            </h2>
            <dl className="divide-y divide-noite/10 border-y border-noite/10">
              {dados.map(([rotulo, valor]) => (
                <div key={rotulo} className="grid gap-1 py-4 sm:grid-cols-[14rem_1fr] sm:gap-4">
                  <dt className="text-noite/65">{rotulo}</dt>
                  <dd className="font-semibold break-words">{valor}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="contato" aria-labelledby="titulo-contato" className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-20">
          <div>
            <h2 id="titulo-contato" className="text-3xl font-bold tracking-[-0.03em]">
              Fale com a gente
            </h2>
            <p className="mt-4 leading-relaxed text-noite/75">
              Dúvidas, suporte para salões, pedidos sobre dados pessoais (LGPD) e contato comercial:{" "}
              <a href={`mailto:${EMAIL_LEGAL}`} className={LINK}>
                {EMAIL_LEGAL}
              </a>
              . Respondemos por e-mail em dias úteis.
            </p>
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-[-0.03em]">Recebeu uma mensagem do AgendOn?</h2>
            <div className="mt-4 space-y-3 leading-relaxed text-noite/75">
              <p>
                O número {WHATSAPP_ENVIO.exibicao} envia, em nome dos salões que usam o AgendOn, a confirmação e o
                lembrete de horários marcados. Só recebe quem autorizou ao agendar.
              </p>
              <p>
                Para não receber mais, responda <strong className="text-noite">SAIR</strong> nessa conversa. Esse número
                não atende conversas: para remarcar ou cancelar, fale com o salão. Para pedidos sobre os seus dados,
                procure o salão (que decide sobre eles) ou escreva para{" "}
                <a href={`mailto:${EMAIL_LEGAL}`} className={LINK}>
                  {EMAIL_LEGAL}
                </a>
                .
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <p className="text-sm text-noite/70">
            Leia também os{" "}
            <Link href="/termos" className={LINK}>
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" className={LINK}>
              Política de Privacidade
            </Link>
            .
          </p>
        </section>
      </main>
      <Rodape />
    </>
  );
}
