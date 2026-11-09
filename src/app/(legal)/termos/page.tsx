import type { Metadata } from "next";
import Link from "next/link";
import { EMAIL_LEGAL, EMPRESA, SITE } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Termos de Uso · AgendOn",
  description: "Regras de uso do AgendOn, sistema de agendamento online para salões de beleza.",
};

const Email = () => <a href={`mailto:${EMAIL_LEGAL}`}>{EMAIL_LEGAL}</a>;

export default function PaginaTermos() {
  return (
    <>
      <h1>Termos de Uso</h1>
      <p>
        Estes termos regem o uso do AgendOn ({SITE}), sistema de agendamento online oferecido por{" "}
        <strong>{EMPRESA.nome}</strong>, {EMPRESA.documento}, com sede em {EMPRESA.cidade} (“AgendOn”, “nós”). Ao
        criar uma conta, você declara que leu e aceita estes termos e a{" "}
        <Link href="/privacidade">Política de Privacidade</Link>.
      </p>

      <h2>1. O serviço</h2>
      <p>
        O AgendOn permite que salões de beleza e profissionais autônomos (“salão”, “você”) organizem sua agenda,
        cadastrem serviços, profissionais e clientes, recebam agendamentos por uma página pública e enviem
        confirmações e lembretes aos clientes.
      </p>
      <p>
        O AgendOn é uma ferramenta: não presta os serviços de beleza, não participa da relação entre o salão e seus
        clientes e não responde pela qualidade, pelo preço ou pela realização dos atendimentos.
      </p>

      <h2>2. Conta e acesso</h2>
      <ul>
        <li>Para criar uma conta é preciso ter pelo menos 18 anos e informar dados verdadeiros.</li>
        <li>
          Você é responsável por manter sua senha em sigilo e por tudo o que for feito com sua conta. Avise-nos em{" "}
          <Email /> se suspeitar de uso indevido.
        </li>
        <li>
          O dono ou a dona do salão pode dar acesso a pessoas da equipe (recepção e profissionais) e responde pelo
          uso que elas fizerem do sistema.
        </li>
        <li>O endereço da página de agendamento é escolhido por você e não pode imitar marcas ou nomes de terceiros.</li>
      </ul>

      <h2>3. Dados dos seus clientes</h2>
      <p>
        Pela LGPD, o <strong>salão é o controlador</strong> dos dados dos seus clientes e o AgendOn é o{" "}
        <strong>operador</strong>, tratando esses dados apenas para prestar o serviço, conforme a{" "}
        <Link href="/privacidade">Política de Privacidade</Link>. Por isso, você se compromete a:
      </p>
      <ul>
        <li>ter uma base legal para cadastrar e tratar os dados dos seus clientes;</li>
        <li>
          não registrar CPF, informações de saúde, fotos ou outros dados sensíveis nas observações ou em qualquer
          campo do sistema;
        </li>
        <li>
          enviar mensagens pelo WhatsApp apenas a quem autorizou e respeitar quem pedir para não receber mais (por
          exemplo, respondendo SAIR);
        </li>
        <li>atender os pedidos dos seus clientes sobre os dados deles, com o nosso apoio quando necessário.</li>
      </ul>

      <h2>4. Uso permitido</h2>
      <p>Não é permitido usar o AgendOn para:</p>
      <ul>
        <li>enviar mensagens em massa, propaganda não autorizada ou conteúdo ilegal, ofensivo ou enganoso;</li>
        <li>tentar acessar dados de outros salões, burlar limites técnicos ou prejudicar o funcionamento do sistema;</li>
        <li>revender ou copiar o serviço sem autorização.</li>
      </ul>
      <p>
        Se houver uso indevido, podemos suspender o acesso, avisando você sempre que possível e dando a chance de
        explicar ou corrigir, exceto quando a urgência ou a lei não permitir.
      </p>

      <h2>5. Preço</h2>
      <p>
        Durante a fase de testes (piloto), o uso do AgendOn é gratuito. Antes de começar qualquer cobrança,
        avisaremos com pelo menos 30 dias de antecedência, com os planos e preços, e você poderá encerrar a conta
        sem custo.
      </p>

      <h2>6. Disponibilidade e suporte</h2>
      <p>
        Trabalhamos para manter o AgendOn disponível e seguro, mas o serviço pode ficar indisponível por manutenção,
        falhas de fornecedores ou de internet. Mudanças planejadas que afetem o uso serão avisadas com antecedência
        sempre que possível. Durante o piloto, o suporte é feito por e-mail.
      </p>
      <p>
        As confirmações e lembretes pelo WhatsApp dependem da Meta. Não garantimos a entrega de todas as mensagens,
        por isso a agenda do painel é a referência dos horários marcados.
      </p>

      <h2>7. Propriedade intelectual</h2>
      <p>
        O software, a marca e o visual do AgendOn são nossos. Os dados que você cadastra continuam sendo seus (e dos
        seus clientes): você pode exportá-los e não os usamos para outros fins além dos previstos na Política de
        Privacidade.
      </p>

      <h2>8. Responsabilidade</h2>
      <p>
        Na medida permitida pela lei, o AgendOn não responde por prejuízos indiretos, como lucros cessantes ou perda
        de clientes, causados por indisponibilidade do serviço, falhas de fornecedores, mensagens não entregues ou
        informações incorretas cadastradas pelo salão. Nada nestes termos afasta direitos garantidos por lei,
        inclusive pelo Código de Defesa do Consumidor quando ele se aplicar.
      </p>

      <h2>9. Encerramento</h2>
      <p>
        Você pode encerrar sua conta quando quiser, escrevendo para <Email />. Depois do encerramento, os dados
        ficam disponíveis para exportação por 30 dias e são excluídos ou anonimizados em até 90 dias, exceto o que a
        lei mandar guardar.
      </p>

      <h2>10. Mudanças nestes termos</h2>
      <p>
        Podemos atualizar estes termos. Se a mudança for relevante, avisaremos pelo painel ou por e-mail com pelo
        menos 15 dias de antecedência. Se você não concordar, poderá encerrar a conta antes de a mudança valer.
      </p>

      <h2>11. Lei e foro</h2>
      <p>
        Estes termos seguem a lei brasileira. Fica eleito o foro da comarca de {EMPRESA.cidade}, exceto quando a lei
        garantir a você o foro do seu domicílio.
      </p>

      <h2>12. Contato</h2>
      <p>
        Dúvidas sobre estes termos: <Email />.
      </p>
    </>
  );
}
