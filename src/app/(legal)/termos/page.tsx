import type { Metadata } from "next";
import Link from "next/link";
import { EMAIL_LEGAL, EMPRESA, SITE } from "@/lib/legal";
import { Destaque, Resumo } from "../destaque";

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
        Estes termos são o contrato entre o salão (ou profissional autônomo) que usa o AgendOn ({SITE}) e{" "}
        <strong>{EMPRESA.nome}</strong>, {EMPRESA.documento}, com sede em {EMPRESA.cidade} (“AgendOn”, “nós”). Eles
        valem junto com a <Link href="/privacidade">Política de Privacidade</Link>. Para criar uma conta ou entrar
        numa equipe, você marca a caixa “Li e aceito”; sem esse aceite, a conta não é criada.
      </p>

      <Resumo>
        <ul>
          <li>O AgendOn organiza a agenda do seu salão. Os atendimentos são seus; nós fornecemos a ferramenta.</li>
          <li>
            Nos dados dos seus clientes, <strong>o salão decide</strong> (controlador) e{" "}
            <strong>o AgendOn executa</strong> (operador): só usamos esses dados para o sistema funcionar.
          </li>
          <li>Você pode exportar os dados e encerrar a conta quando quiser.</li>
          <li>Durante o piloto, o uso é gratuito. Qualquer cobrança será avisada com 30 dias de antecedência.</li>
          <li>As partes em destaque (com a barra azul) limitam direitos: leia com atenção.</li>
        </ul>
      </Resumo>

      <h2>1. O serviço</h2>
      <p>
        O AgendOn permite que salões de beleza e profissionais autônomos (“salão”, “você”) organizem a agenda,
        cadastrem serviços, profissionais e clientes, recebam agendamentos por uma página pública e enviem
        confirmações e lembretes aos clientes.
      </p>
      <Destaque>
        <p>
          O AgendOn é uma ferramenta. Não presta os serviços de beleza, não participa da relação entre o salão e os
          clientes dele e não responde pela qualidade, pelo preço ou pela realização dos atendimentos.
        </p>
      </Destaque>

      <h2>2. Conta e acesso</h2>
      <ul>
        <li>Para criar uma conta é preciso ter pelo menos 18 anos e informar dados verdadeiros.</li>
        <li>
          Guarde sua senha em sigilo: você responde pelo que for feito com a sua conta. Se suspeitar de uso indevido,
          troque a senha e avise-nos em <Email />.
        </li>
        <li>
          O dono ou a dona do salão pode dar acesso à equipe (recepção e profissionais), escolhe o que cada um vê e
          responde pelo uso que fizerem do sistema. Quando alguém sair da equipe, desative o acesso no painel.
        </li>
        <li>O endereço da página de agendamento é escolhido por você e não pode imitar marcas ou nomes de terceiros.</li>
      </ul>

      <h2>3. Nosso papel nos dados pessoais</h2>
      <p>Pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018, “LGPD”), o AgendOn tem dois papéis:</p>
      <ul>
        <li>
          <strong>Controlador</strong> dos dados de quem usa o painel (donos, recepção e profissionais): decidimos
          como esses dados são usados, sempre conforme a <Link href="/privacidade">Política de Privacidade</Link>.
        </li>
        <li>
          <strong>Operador</strong> dos dados dos clientes do salão (nome, WhatsApp, agendamentos e observações): o{" "}
          <strong>salão é o controlador</strong> e nós tratamos esses dados em nome dele.
        </li>
      </ul>

      <h3>3.1. O que o AgendOn se compromete a fazer, como operador</h3>
      <ul>
        <li>
          Usar os dados dos seus clientes <strong>só para prestar o serviço</strong>, conforme as suas instruções. As
          configurações e as ações que você faz no painel são as suas instruções.
        </li>
        <li>Não vender, não usar para publicidade e não usar esses dados para fins próprios.</li>
        <li>Manter os dados em sigilo e dar acesso apenas a quem precisa para operar o sistema.</li>
        <li>
          Usar só os fornecedores listados na Política de Privacidade. Ao aceitar estes termos, você autoriza esses
          fornecedores. Se incluirmos um novo fornecedor que trate dados dos seus clientes, avisaremos com pelo menos
          15 dias de antecedência; se não concordar, você pode encerrar a conta sem custo.
        </li>
        <li>
          Oferecer ferramentas para você atender os seus clientes: no painel, o dono ou a dona pode exportar os dados
          de um cliente e anonimizá-lo. Se um cliente seu nos procurar, encaminharemos o pedido ao salão.
        </li>
        <li>
          Manter medidas de segurança adequadas (veja a seção 4) e <strong>avisar o salão em até 48 horas</strong>{" "}
          depois de confirmarmos um incidente de segurança que envolva dados dos clientes dele, com as informações
          que tivermos, para que o salão possa avisar a Autoridade Nacional de Proteção de Dados (ANPD) e os clientes
          no prazo da lei.
        </li>
        <li>
          Quando a conta for encerrada, deixar os dados disponíveis para exportação por 30 dias e depois excluí-los
          ou anonimizá-los em até 90 dias, exceto o que a lei mandar guardar.
        </li>
        <li>Colaborar com o salão e com a ANPD quando houver pedido de informação sobre esses dados.</li>
      </ul>

      <h3>3.2. O que o salão se compromete a fazer, como controlador</h3>
      <ul>
        <li>Ter uma base legal para cadastrar e tratar os dados dos seus clientes e informar a eles como faz isso.</li>
        <li>
          Não registrar CPF, informações de saúde, fotos ou outros dados sensíveis nas observações ou em qualquer
          campo do sistema.
        </li>
        <li>
          Enviar mensagens pelo WhatsApp apenas a quem autorizou e respeitar quem pedir para não receber mais (por
          exemplo, respondendo SAIR).
        </li>
        <li>Atender os pedidos dos seus clientes sobre os dados deles (acesso, correção, exclusão), no prazo da lei.</li>
        <li>Garantir que a sua equipe use o sistema e os dados só para os atendimentos.</li>
      </ul>
      <p>
        Alguns fornecedores ficam fora do Brasil. Como essa transferência internacional é feita e protegida está na
        seção 5 da <Link href="/privacidade">Política de Privacidade</Link>.
      </p>

      <h2>4. Segurança da informação</h2>
      <p>
        Mantemos medidas técnicas e administrativas para proteger os dados contra acesso indevido, perda ou
        vazamento: conexão criptografada, senhas guardadas com criptografia, isolamento entre salões, acesso por
        perfil, registro das ações sensíveis e um procedimento para responder a incidentes. A lista completa está na seção 9
        da <Link href="/privacidade">Política de Privacidade</Link>.
      </p>
      <p>
        A segurança também depende de você: use uma senha forte e só sua, não compartilhe logins entre pessoas e
        desative quem sair da equipe.
      </p>

      <h2>5. Uso permitido</h2>
      <p>Não é permitido usar o AgendOn para:</p>
      <ul>
        <li>enviar mensagens em massa, propaganda não autorizada ou conteúdo ilegal, ofensivo ou enganoso;</li>
        <li>tentar acessar dados de outros salões, burlar limites técnicos ou prejudicar o funcionamento do sistema;</li>
        <li>revender ou copiar o serviço sem autorização.</li>
      </ul>
      <Destaque>
        <p>
          Se houver uso indevido, podemos suspender o acesso. Sempre que possível, avisaremos antes e daremos a chance
          de explicar ou corrigir, exceto quando a urgência (por exemplo, um ataque em andamento) ou a lei não
          permitir.
        </p>
      </Destaque>

      <h2>6. Preço</h2>
      <p>
        Durante a fase de testes (piloto), o uso do AgendOn é gratuito. Antes de começar qualquer cobrança,
        avisaremos com pelo menos 30 dias de antecedência, com os planos e preços, e você poderá encerrar a conta
        sem custo.
      </p>

      <h2>7. Disponibilidade e suporte</h2>
      <p>
        Trabalhamos para manter o AgendOn no ar e seguro, mas o serviço pode ficar indisponível por manutenção,
        falhas de fornecedores ou de internet. Mudanças planejadas que afetem o uso serão avisadas com antecedência
        sempre que possível. Durante o piloto, o suporte é feito por e-mail.
      </p>
      <Destaque>
        <p>
          As confirmações e lembretes pelo WhatsApp dependem da Meta. Não garantimos a entrega de todas as mensagens:
          a agenda do painel é a referência dos horários marcados.
        </p>
      </Destaque>

      <h2>8. Propriedade intelectual e seus dados</h2>
      <p>
        O software, a marca e o visual do AgendOn são nossos. Os dados que você cadastra continuam sendo seus (e dos
        seus clientes): você pode exportá-los e nós não os usamos para nada além do previsto nestes termos e na
        Política de Privacidade.
      </p>

      <h2>9. Responsabilidade</h2>
      <Destaque>
        <p>
          Na medida permitida pela lei, o AgendOn não responde por prejuízos indiretos, como lucros cessantes ou
          perda de clientes, causados por indisponibilidade do serviço, falhas de fornecedores, mensagens não
          entregues ou informações incorretas cadastradas pelo salão.
        </p>
      </Destaque>
      <p>
        Esta limitação não vale para danos causados por dolo ou culpa grave nossa, nem para o descumprimento das
        nossas obrigações de proteção de dados. Nada nestes termos afasta direitos garantidos por lei, inclusive
        pelo Código de Defesa do Consumidor quando ele se aplicar.
      </p>

      <h2>10. Como encerrar a conta e apagar os dados</h2>
      <ol>
        <li>
          Se quiser, exporte antes os dados que precisar guardar (por exemplo, o histórico dos clientes).
        </li>
        <li>
          Escreva para <Email /> a partir do e-mail do dono ou da dona do salão pedindo o encerramento. Podemos pedir
          uma confirmação para ter certeza de que o pedido é seu.
        </li>
        <li>
          Confirmamos o encerramento por e-mail. Os dados ficam disponíveis para exportação por 30 dias e são
          excluídos ou anonimizados em até 90 dias, exceto o que a lei mandar guardar (por exemplo, registros de
          acesso por 6 meses).
        </li>
      </ol>
      <p>
        Quem faz parte de uma equipe e quer apagar os próprios dados de acesso pode pedir ao dono ou à dona do salão
        para desativar o acesso e escrever para <Email />. Clientes dos salões encontram o caminho na{" "}
        <Link href="/privacidade">Política de Privacidade</Link>, seção 8.
      </p>

      <h2>11. Mudanças nestes termos</h2>
      <p>
        Podemos atualizar estes termos. Se a mudança for relevante, avisaremos pelo painel ou por e-mail com pelo
        menos 15 dias de antecedência e pediremos um novo aceite no painel. Se você não concordar, poderá encerrar
        a conta antes de a mudança valer.
      </p>

      <h2>12. Lei e foro</h2>
      <p>
        Estes termos seguem a lei brasileira. Fica eleito o foro da comarca de {EMPRESA.cidade}, exceto quando a lei
        garantir a você o foro do seu domicílio.
      </p>

      <h2>13. Contato</h2>
      <p>
        Dúvidas sobre estes termos: <Email />.
      </p>
    </>
  );
}
