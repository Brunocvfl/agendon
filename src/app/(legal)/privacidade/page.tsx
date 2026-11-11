import type { Metadata } from "next";
import Link from "next/link";
import { EMAIL_LEGAL, EMPRESA, SITE } from "@/lib/legal";
import { Destaque, Resumo } from "../destaque";

export const metadata: Metadata = {
  title: "Política de Privacidade · AgendOn",
  description: "Como o AgendOn trata dados pessoais de salões, profissionais e clientes, conforme a LGPD.",
};

const Email = () => <a href={`mailto:${EMAIL_LEGAL}`}>{EMAIL_LEGAL}</a>;

// Fornecedores que tratam dados em nosso nome (suboperadores). Incluiu um? Avise os salões com 15 dias (Termos, 3.1).
const FORNECEDORES = [
  { nome: "Supabase", para: "Banco de dados, login e arquivos (logo do salão)", onde: "Dados guardados em São Paulo (Brasil); empresa dos EUA" },
  { nome: "Vercel", para: "Hospedagem do site, do painel e da página de agendamento", onde: "EUA e rede global" },
  { nome: "Cloudflare (Turnstile)", para: "Teste antirrobô na página de agendamento", onde: "EUA e rede global" },
  { nome: "Resend", para: "E-mails de cadastro, convite e troca de senha", onde: "Envio a partir de São Paulo; empresa dos EUA" },
  { nome: "ImprovMX e Google (Gmail)", para: "Recebimento das mensagens enviadas aos nossos e-mails de contato", onde: "Exterior (EUA e outros)" },
  { nome: "Meta (WhatsApp Business Platform)", para: "Confirmações e lembretes pelo WhatsApp, quando ativos para o salão", onde: "Exterior (EUA e outros)" },
] as const;

export default function PaginaPrivacidade() {
  return (
    <>
      <h1>Política de Privacidade</h1>
      <p>
        Esta política explica, de forma direta, como o AgendOn ({SITE}) trata dados pessoais, de acordo com a Lei
        Geral de Proteção de Dados (Lei nº 13.709/2018, “LGPD”). O AgendOn é um sistema de agendamento online para
        salões de beleza e profissionais autônomos, oferecido por <strong>{EMPRESA.nome}</strong>,{" "}
        {EMPRESA.documento}, com sede em {EMPRESA.cidade} (“AgendOn”, “nós”).
      </p>

      <Resumo>
        <ul>
          <li>
            Usamos dados pessoais só para o agendamento funcionar. <strong>Não vendemos dados</strong> e não fazemos
            publicidade com eles.
          </li>
          <li>
            Os dados ficam guardados no Brasil (São Paulo). Alguns fornecedores são estrangeiros e podem tratar dados
            fora do país, com as proteções da seção 5.
          </li>
          <li>
            Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento (seção 8). Respondemos em
            até 15 dias.
          </li>
          <li>
            Para não receber mais mensagens de um salão pelo WhatsApp, responda <strong>SAIR</strong>.
          </li>
          <li>
            Contato do encarregado de dados: <Email />.
          </li>
        </ul>
      </Resumo>

      <h2>1. Quem cuida dos seus dados</h2>
      <ul>
        <li>
          <strong>Você usa o painel</strong> (dono, dona, recepção ou profissional): o AgendOn é o{" "}
          <strong>controlador</strong>, ou seja, decide como esses dados são tratados e responde por isso.
        </li>
        <li>
          <strong>Você é cliente de um salão</strong> (agendou um horário): o <strong>salão é o controlador</strong>{" "}
          e o AgendOn é o <strong>operador</strong>. Tratamos seus dados em nome do salão, só para prestar o serviço
          a ele e conforme as instruções dele. As obrigações de cada um estão na seção 3 dos{" "}
          <Link href="/termos">Termos de Uso</Link>.
        </li>
      </ul>

      <h2>2. Dados de quem usa o painel</h2>
      <h3>Quais dados</h3>
      <ul>
        <li>Dados de acesso: e-mail, senha (guardada com criptografia, nunca em texto) e perfil de acesso.</li>
        <li>Nome, quando informado no convite para a equipe.</li>
        <li>
          Dados do salão: nome, contatos, endereço, logo, endereço da página de agendamento e configurações. Para o
          profissional autônomo, alguns desses dados podem ser pessoais.
        </li>
        <li>Dados dos profissionais cadastrados: nome, serviços, horários de trabalho e folgas.</li>
        <li>
          Registros de acesso e de uso: endereço IP, data e hora, navegador e ações relevantes no sistema (por exemplo,
          exportar ou anonimizar um cliente).
        </li>
        <li>Data e versão em que você aceitou estes documentos.</li>
      </ul>
      <h3>Para quê e com qual base legal</h3>
      <ul>
        <li>
          Criar e manter sua conta, permitir o acesso ao painel e prestar o serviço: <strong>execução de contrato</strong>{" "}
          (art. 7º, V, da LGPD).
        </li>
        <li>
          Enviar e-mails de confirmação de cadastro, convite, troca de senha e avisos importantes sobre o serviço:{" "}
          <strong>execução de contrato</strong>.
        </li>
        <li>
          Guardar registros de acesso pelo prazo do Marco Civil da Internet (Lei nº 12.965/2014):{" "}
          <strong>cumprimento de obrigação legal</strong> (art. 7º, II).
        </li>
        <li>
          Prevenir fraudes e abusos, manter a segurança e melhorar o sistema: <strong>legítimo interesse</strong> (art.
          7º, IX), sempre respeitando seus direitos e expectativas.
        </li>
      </ul>

      <h2>3. Dados dos clientes dos salões</h2>
      <p>
        Quando alguém agenda pela página do salão ou é cadastrado pelo salão no painel, o AgendOn guarda, em nome do
        salão:
      </p>
      <ul>
        <li>nome e número de WhatsApp;</li>
        <li>agendamentos (serviço, profissional, data, horário, preço e situação) e histórico de atendimentos;</li>
        <li>observações que o salão registrar;</li>
        <li>a autorização para receber mensagens pelo WhatsApp, com data e origem, quando ela for dada.</li>
      </ul>
      <p>
        Esses dados são usados somente para: mostrar a agenda ao salão, evitar horários em conflito e enviar
        confirmações e lembretes em nome do salão, quando esse recurso estiver ativo.
      </p>
      <p>
        A autorização para o WhatsApp é opcional: a caixa vem desmarcada e o agendamento funciona sem ela. Se você não
        autorizar, apenas não receberá confirmações e lembretes por mensagem.
      </p>
      <p>
        Na página de agendamento, um teste antirrobô (Cloudflare Turnstile) analisa sinais técnicos do navegador,
        como o endereço IP, para bloquear abusos. Para limitar tentativas repetidas, guardamos só um código derivado
        do IP (que não permite ver o IP), por cerca de 1 dia.
      </p>
      <p>
        Não coletamos CPF, dados de saúde ou fotos dos clientes, e pedimos que o salão não registre esse tipo de
        informação.
      </p>

      <h2>4. Com quem compartilhamos</h2>
      <p>
        Usamos os fornecedores abaixo, que tratam dados em nosso nome, apenas no necessário para o serviço funcionar
        e com obrigações contratuais de confidencialidade e segurança:
      </p>
      <ul>
        {FORNECEDORES.map((f) => (
          <li key={f.nome}>
            <strong>{f.nome}</strong>: {f.para}. <em>Onde:</em> {f.onde}.
          </li>
        ))}
      </ul>
      <p>
        Também podemos compartilhar dados quando a lei exigir ou por ordem de autoridade competente. Nunca vendemos
        dados pessoais.
      </p>

      <h2>5. Transferência internacional de dados</h2>
      <p>
        O banco de dados do AgendOn fica em São Paulo. Mesmo assim, alguns dados podem ser tratados fora do Brasil,
        porque parte dos nossos fornecedores (seção 4) são empresas estrangeiras ou usam servidores no exterior,
        principalmente nos Estados Unidos. Isso acontece, por exemplo, quando uma página passa pela rede de
        hospedagem, quando um e-mail é entregue ou quando uma mensagem é enviada pelo WhatsApp.
      </p>
      <p>Para proteger esses dados:</p>
      <ul>
        <li>
          a transferência só acontece para prestar o serviço e segue o art. 33 da LGPD e o Regulamento de
          Transferência Internacional de Dados da ANPD (Resolução CD/ANPD nº 19/2024), com cláusulas contratuais
          que exigem do fornecedor um nível de proteção compatível com a lei brasileira;
        </li>
        <li>escolhemos fornecedores com práticas reconhecidas de segurança e enviamos só o mínimo necessário;</li>
        <li>os dados continuam protegidos pela LGPD e você mantém todos os direitos da seção 8.</li>
      </ul>
      <p>
        Se quiser saber mais sobre uma transferência específica, escreva para <Email />.
      </p>

      <h2>6. Cookies</h2>
      <p>
        Usamos apenas cookies essenciais, que mantêm você conectado ao painel com segurança. Não usamos cookies de
        publicidade nem de rastreamento. A página de agendamento dos salões não exige login.
      </p>

      <h2>7. Por quanto tempo guardamos</h2>
      <ul>
        <li>
          <strong>Dados da conta e do salão:</strong> enquanto a conta estiver ativa. Depois do encerramento, ficam
          disponíveis para exportação por 30 dias e são excluídos ou anonimizados em até 90 dias.
        </li>
        <li>
          <strong>Registros de acesso:</strong> 6 meses, como exige o Marco Civil da Internet.
        </li>
        <li>
          <strong>Dados dos clientes dos salões:</strong> enquanto a pessoa continuar agendando. Quem fica 24 meses
          sem nenhum agendamento é anonimizado automaticamente: nome, WhatsApp e observações são apagados e os
          atendimentos passados ficam sem identificação. Quando o salão encerra a conta, esses dados seguem os prazos
          do primeiro item.
        </li>
        <li>
          Dados que precisem ser mantidos por obrigação legal ou para defesa em processos são guardados só pelo prazo
          necessário para isso.
        </li>
      </ul>

      <h2>8. Seus direitos e como exercê-los</h2>
      <p>Pela LGPD (art. 18), você pode pedir, sem custo:</p>
      <ul>
        <li>confirmação de que tratamos seus dados e acesso a eles;</li>
        <li>correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desacordo com a lei;</li>
        <li>portabilidade dos dados (uma cópia em formato aberto);</li>
        <li>eliminação dos dados tratados com o seu consentimento;</li>
        <li>informação sobre com quem compartilhamos seus dados (seção 4);</li>
        <li>informação sobre o que acontece se você não der o consentimento;</li>
        <li>revogação do consentimento, a qualquer momento;</li>
        <li>oposição a um tratamento que não cumpra a lei;</li>
        <li>revisão de decisões tomadas apenas com base em tratamento automatizado.</li>
      </ul>

      <h3>Como apagar ou pedir seus dados: cliente de um salão</h3>
      <ol>
        <li>
          Fale com o salão onde você agendou. No painel do AgendOn, o salão consegue{" "}
          <strong>baixar uma cópia dos seus dados</strong> e <strong>anonimizar seu cadastro</strong>: nome, WhatsApp
          e observações são apagados de forma definitiva e os agendamentos futuros são cancelados.
        </li>
        <li>
          Se não conseguir falar com o salão, escreva para <Email /> dizendo o nome do salão e o seu WhatsApp.
          Encaminharemos o pedido ao salão e acompanharemos a resposta.
        </li>
        <li>
          Para parar de receber mensagens pelo WhatsApp, basta responder <strong>SAIR</strong> a qualquer mensagem.
        </li>
      </ol>

      <h3>Como apagar ou pedir seus dados: quem usa o painel</h3>
      <ol>
        <li>
          Escreva para <Email /> a partir do e-mail da sua conta, dizendo o que você quer (cópia, correção ou
          exclusão).
        </li>
        <li>Podemos pedir uma confirmação para ter certeza de que o pedido é seu.</li>
        <li>
          Respondemos em até 15 dias. Na exclusão, apagamos ou anonimizamos os dados, exceto o que a lei mandar
          guardar (por exemplo, registros de acesso por 6 meses). O encerramento da conta do salão está na seção 10
          dos <Link href="/termos">Termos de Uso</Link>.
        </li>
      </ol>
      <p>
        Se não ficar satisfeito com a resposta, você pode reclamar à Autoridade Nacional de Proteção de Dados (
        <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer">
          gov.br/anpd
        </a>
        ).
      </p>

      <h2>9. Segurança da informação</h2>
      <p>Adotamos medidas técnicas e administrativas para proteger os dados:</p>
      <ul>
        <li>conexão sempre criptografada (HTTPS) e senhas guardadas com criptografia;</li>
        <li>
          isolamento entre salões garantido no próprio banco de dados: um salão nunca acessa os dados de outro;
        </li>
        <li>
          acesso por perfil: cada pessoa vê só o que precisa (por exemplo, o profissional não vê o telefone dos
          clientes);
        </li>
        <li>senhas fortes obrigatórias e confirmação do e-mail no cadastro;</li>
        <li>proteção contra robôs e limite de tentativas na página de agendamento;</li>
        <li>registro das ações sensíveis, como exportar e anonimizar dados de clientes;</li>
        <li>chaves de acesso aos sistemas guardadas fora do código e testes de segurança antes das mudanças;</li>
        <li>dados pessoais fora dos registros de erro do sistema.</li>
      </ul>
      <Destaque>
        <p>
          Nenhum sistema é totalmente imune a falhas. Se acontecer um incidente de segurança que possa trazer risco
          ou dano relevante, seguimos um plano de resposta: contemos o problema, avisamos os salões afetados em até
          48 horas da confirmação e comunicamos a ANPD e, quando for o caso, as pessoas afetadas, nos prazos da
          Resolução CD/ANPD nº 15/2024.
        </p>
      </Destaque>

      <h2>10. Crianças e adolescentes</h2>
      <p>
        O painel do AgendOn é destinado a maiores de 18 anos. Quando o cliente de um salão for criança ou
        adolescente, o agendamento deve ser feito por um dos pais ou responsável, e o salão deve tratar esses dados
        no melhor interesse do menor.
      </p>

      <h2>11. Mudanças nesta política</h2>
      <p>
        Podemos atualizar esta política. Se a mudança for relevante, avisaremos pelo painel ou por e-mail antes de
        ela valer e pediremos um novo aceite. A data da última atualização fica no fim desta página.
      </p>

      <h2>12. Encarregado e contato</h2>
      <p>
        Encarregado pelo tratamento de dados pessoais (DPO): <Email />. Veja também os{" "}
        <Link href="/termos">Termos de Uso</Link>.
      </p>
    </>
  );
}
