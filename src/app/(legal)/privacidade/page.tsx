import type { Metadata } from "next";
import Link from "next/link";
import { EMAIL_LEGAL, EMPRESA, SITE } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de Privacidade · AgendOn",
  description: "Como o AgendOn trata dados pessoais de salões, profissionais e clientes, conforme a LGPD.",
};

const Email = () => <a href={`mailto:${EMAIL_LEGAL}`}>{EMAIL_LEGAL}</a>;

export default function PaginaPrivacidade() {
  return (
    <>
      <h1>Política de Privacidade</h1>
      <p>
        Esta política explica como o AgendOn ({SITE}) trata dados pessoais, de acordo com a Lei Geral de Proteção de
        Dados (Lei nº 13.709/2018, “LGPD”). O AgendOn é um sistema de agendamento online para salões de beleza e
        profissionais autônomos, oferecido por <strong>{EMPRESA.nome}</strong>, {EMPRESA.documento}, com sede em{" "}
        {EMPRESA.cidade} (“AgendOn”, “nós”).
      </p>

      <h2>1. Resumo</h2>
      <ul>
        <li>
          <strong>Dados de quem usa o painel</strong> (donos, recepção e profissionais): o AgendOn é o{" "}
          <strong>controlador</strong> e decide como esses dados são tratados.
        </li>
        <li>
          <strong>Dados dos clientes dos salões</strong> (quem agenda um horário): o <strong>salão é o controlador</strong>{" "}
          e o AgendOn é o <strong>operador</strong>, tratando esses dados apenas para prestar o serviço ao salão e
          conforme as instruções dele.
        </li>
        <li>Não vendemos dados pessoais e não os usamos para publicidade.</li>
        <li>
          Contato do encarregado de dados: <Email />.
        </li>
      </ul>

      <h2>2. Dados de quem usa o painel</h2>
      <h3>Quais dados</h3>
      <ul>
        <li>Dados de acesso: e-mail, senha (guardada de forma criptografada, nunca em texto) e perfil de acesso.</li>
        <li>Dados do salão: nome, endereço da página de agendamento e configurações.</li>
        <li>Dados dos profissionais cadastrados: nome, serviços, horários de trabalho e folgas.</li>
        <li>
          Registros de acesso e de uso: endereço IP, data e hora, navegador e ações relevantes no sistema (por exemplo,
          criação ou mudança de um agendamento).
        </li>
      </ul>
      <h3>Para quê e com qual base legal</h3>
      <ul>
        <li>
          Criar e manter sua conta, permitir o acesso ao painel e prestar o serviço contratado:{" "}
          <strong>execução de contrato</strong> (art. 7º, V, da LGPD).
        </li>
        <li>
          Enviar e-mails de confirmação de cadastro, troca de senha e avisos importantes sobre o serviço:{" "}
          <strong>execução de contrato</strong>.
        </li>
        <li>
          Guardar registros de acesso pelo prazo exigido pelo Marco Civil da Internet (Lei nº 12.965/2014):{" "}
          <strong>cumprimento de obrigação legal</strong> (art. 7º, II).
        </li>
        <li>
          Prevenir fraudes e abusos, manter a segurança e melhorar o sistema: <strong>legítimo interesse</strong> (art.
          7º, IX), sempre respeitando seus direitos e expectativas.
        </li>
      </ul>

      <h2>3. Dados dos clientes dos salões</h2>
      <p>
        Quando alguém agenda um horário pela página do salão ou é cadastrado pelo próprio salão no painel, o AgendOn
        guarda, em nome do salão:
      </p>
      <ul>
        <li>nome e número de WhatsApp;</li>
        <li>agendamentos (serviço, profissional, data, horário, preço e situação) e histórico de atendimentos;</li>
        <li>observações que o salão registrar;</li>
        <li>
          o consentimento para receber mensagens pelo WhatsApp, com data e origem, quando os lembretes estiverem
          ativos.
        </li>
      </ul>
      <p>
        O salão é responsável por ter uma base legal para tratar esses dados e por atender os pedidos dos seus
        clientes. O AgendOn usa esses dados somente para: mostrar a agenda ao salão, evitar horários em conflito,
        enviar confirmações e lembretes em nome do salão e permitir que o cliente cancele ou remarque pelo link
        recebido.
      </p>
      <p>
        Não coletamos CPF, dados de saúde ou fotos dos clientes. Pedimos que o salão não registre esse tipo de
        informação nas observações.
      </p>
      <p>
        <strong>É cliente de um salão?</strong> Para acessar, corrigir ou excluir seus dados, fale primeiro com o
        salão onde você agendou. Se não conseguir, escreva para <Email /> e encaminharemos o pedido ao salão.
      </p>

      <h2>4. Com quem compartilhamos</h2>
      <p>
        Usamos fornecedores que tratam dados em nosso nome, apenas no necessário para o serviço funcionar e sob
        obrigações de confidencialidade e segurança:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong>: banco de dados e autenticação. Os dados ficam em servidores em São Paulo (Brasil).
        </li>
        <li>
          <strong>Vercel</strong>: hospedagem do site e do painel.
        </li>
        <li>
          <strong>Resend</strong>: envio dos e-mails de cadastro e de troca de senha.
        </li>
        <li>
          <strong>ImprovMX</strong>: encaminhamento das mensagens enviadas aos nossos e-mails de contato.
        </li>
        <li>
          <strong>Meta (WhatsApp Business Platform)</strong>: envio de confirmações e lembretes pelo WhatsApp, quando
          esse recurso estiver ativo para o salão.
        </li>
      </ul>
      <p>
        Alguns desses fornecedores são empresas estrangeiras e podem tratar dados fora do Brasil. Nesses casos, a
        transferência internacional segue o art. 33 da LGPD e a regulamentação da Autoridade Nacional de Proteção de
        Dados (ANPD), com cláusulas contratuais que garantem um nível de proteção adequado.
      </p>
      <p>
        Também podemos compartilhar dados quando a lei exigir ou por ordem de autoridade competente.
      </p>

      <h2>5. Cookies</h2>
      <p>
        Usamos apenas cookies essenciais, que mantêm você conectado ao painel com segurança. Não usamos cookies de
        publicidade nem de rastreamento. A página de agendamento dos salões não exige login.
      </p>

      <h2>6. Por quanto tempo guardamos</h2>
      <ul>
        <li>
          <strong>Dados da conta e do salão:</strong> enquanto a conta estiver ativa. Depois do encerramento, ficam
          disponíveis para exportação por 30 dias e são excluídos ou anonimizados em até 90 dias.
        </li>
        <li>
          <strong>Registros de acesso:</strong> pelo menos 6 meses, como exige o Marco Civil da Internet.
        </li>
        <li>
          <strong>Dados dos clientes dos salões:</strong> enquanto a pessoa continuar agendando. Quem fica 24 meses
          sem nenhum agendamento é anonimizado automaticamente: nome, WhatsApp e observações são apagados e os
          atendimentos passados ficam sem identificação. A pedido do cliente, o salão pode exportar os dados dele ou
          anonimizá-lo a qualquer momento. Quando o salão encerra a conta, esses dados seguem os mesmos prazos acima.
        </li>
        <li>
          Dados que precisem ser mantidos por obrigação legal ou para defesa em processos são guardados pelo prazo
          necessário para isso.
        </li>
      </ul>

      <h2>7. Seus direitos</h2>
      <p>Pela LGPD (art. 18), você pode pedir:</p>
      <ul>
        <li>confirmação de que tratamos seus dados e acesso a eles;</li>
        <li>correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desacordo com a lei;</li>
        <li>portabilidade dos dados;</li>
        <li>informação sobre com quem compartilhamos seus dados;</li>
        <li>revogação do consentimento, quando o tratamento depender dele;</li>
        <li>revisão de decisões tomadas apenas com base em tratamento automatizado.</li>
      </ul>
      <p>
        Para exercer seus direitos, escreva para <Email />. Podemos pedir informações para confirmar sua identidade.
        Respondemos em até 15 dias. Você também pode reclamar à ANPD (
        <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer">
          gov.br/anpd
        </a>
        ).
      </p>
      <p>
        Para parar de receber mensagens de um salão pelo WhatsApp, responda <strong>SAIR</strong> a qualquer
        mensagem.
      </p>

      <h2>8. Segurança</h2>
      <p>
        Usamos conexão criptografada (HTTPS), senhas guardadas com criptografia, controle de acesso por perfil
        (cada pessoa vê apenas o que precisa) e isolamento entre salões: um salão nunca acessa os dados de outro.
        Nenhum sistema é totalmente imune a falhas; se ocorrer um incidente de segurança que possa trazer risco ou
        dano relevante, avisaremos os salões afetados, a ANPD e, quando for o caso, os titulares, nos prazos da
        regulamentação.
      </p>

      <h2>9. Crianças e adolescentes</h2>
      <p>
        O painel do AgendOn é destinado a maiores de 18 anos. Quando o cliente de um salão for criança ou
        adolescente, o agendamento deve ser feito por um dos pais ou responsável, e o salão é responsável por tratar
        esses dados no melhor interesse do menor.
      </p>

      <h2>10. Mudanças nesta política</h2>
      <p>
        Podemos atualizar esta política. Se a mudança for relevante, avisaremos pelo painel ou por e-mail antes de
        ela valer. A data da última atualização fica no fim desta página.
      </p>

      <h2>11. Contato</h2>
      <p>
        Encarregado pelo tratamento de dados pessoais: <Email />. Veja também os{" "}
        <Link href="/termos">Termos de Uso</Link>.
      </p>
    </>
  );
}
