import type { Metadata } from "next";
import Link from "next/link";
import { Alerta, Cartao } from "@/components/ui";
import { PaginaProtegida } from "@/components/pagina-protegida";
import type { Vinculo } from "@/lib/auth";
import { formatarData } from "@/lib/datas";
import { formatarPreco } from "@/lib/formato";
import { NOME_DA_SITUACAO, NOME_DO_PLANO, PACOTE_EXTRA, ehPlanoPago, type UsoDoPlano } from "@/lib/regras/plano";
import { AbasConfiguracoes } from "../abas";
import { carregarPlano } from "./dados";
import { FormCompra, FormPacote } from "./form-compra";

export const metadata: Metadata = { title: "Plano e cobrança · AgendOn" };

type Props = { searchParams: Promise<{ retorno?: string }> };

// Plano e cobrança (AGE-14): plano atual e pagamento pelo Checkout Pro do Mercado Pago.
export default function PaginaPlano({ searchParams }: Props) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold sm:text-3xl">Configurações</h1>
      <AbasConfiguracoes ativa="Plano e cobrança" />
      <PaginaProtegida exige="gerenciar-salao" carregando={<Cartao className="mt-6 h-96">{null}</Cartao>}>
        {({ vinculo }) => <Conteudo vinculo={vinculo} searchParams={searchParams} />}
      </PaginaProtegida>
    </div>
  );
}

// O Mercado Pago devolve a pessoa com ?retorno=... (back_urls do checkout). Quem manda no plano é o webhook.
const RETORNOS: Record<string, { tipo: "erro" | "sucesso"; texto: string }> = {
  aprovado: { tipo: "sucesso", texto: "Pagamento aprovado. O plano é atualizado em instantes; recarregue a página." },
  pendente: { tipo: "sucesso", texto: "Pagamento em análise. Assim que o Mercado Pago aprovar, o plano é atualizado." },
  falhou: { tipo: "erro", texto: "O pagamento não foi concluído. Nada foi cobrado; tente de novo quando quiser." },
};

async function Conteudo({ vinculo, searchParams }: { vinculo: Vinculo; searchParams: Props["searchParams"] }) {
  const [{ retorno }, uso] = await Promise.all([searchParams, carregarPlano(vinculo.salao.id)]);
  if (!uso) throw new Error("Falha ao carregar o plano.");
  const aviso = retorno ? RETORNOS[retorno] : undefined;
  const combinado = uso.plano === "cortesia" || uso.plano === "sob_consulta";

  return (
    <>
      {aviso ? (
        <div className="mt-6">
          <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>
        </div>
      ) : null}

      <Cartao className="mt-6">
        <PlanoAtual uso={uso} fuso={vinculo.salao.fuso} />
      </Cartao>

      {combinado ? (
        <p className="mt-6 text-sm text-noite/70">
          Seu plano foi combinado com a gente e não é cobrado por aqui.{" "}
          <Link href="/contato" className="font-medium text-on hover:underline">
            Fale com a gente
          </Link>{" "}
          para mudar.
        </p>
      ) : (
        <Cartao className="mt-6">
          <h2 className="text-lg font-semibold">{ehPlanoPago(uso.plano) ? "Pagar ou trocar de plano" : "Escolha seu plano"}</h2>
          <p className="mt-1 text-sm text-noite/70">Cobrança por agenda ativa, com as mensagens do WhatsApp incluídas.</p>
          <div className="mt-4">
            <FormCompra atual={uso.plano} agendas={uso.agendas} />
          </div>
        </Cartao>
      )}

      {ehPlanoPago(uso.plano) ? (
        <Cartao className="mt-6">
          <h2 className="text-lg font-semibold">Pacote extra de mensagens</h2>
          <FormPacote
            texto={`${PACOTE_EXTRA.mensagens} mensagens por ${formatarPreco(PACOTE_EXTRA.preco)}, válidas até o fim do mês.`}
          />
        </Cartao>
      ) : null}
    </>
  );
}

function PlanoAtual({ uso, fuso }: { uso: UsoDoPlano; fuso: string }) {
  const max = uso.max_mensagens === null ? null : uso.max_mensagens + (uso.mensagens_extras ?? 0);
  const linhas: [string, string][] = [["Plano", NOME_DO_PLANO[uso.plano]]];
  if (uso.situacao) linhas.push(["Situação", NOME_DA_SITUACAO[uso.situacao]]);
  if (uso.plano === "teste" && uso.teste_ate) linhas.push(["Teste até", formatarData(uso.teste_ate, fuso)]);
  if (uso.pago_ate) linhas.push(["Pago até", formatarData(uso.pago_ate, fuso)]);
  linhas.push(["Agendas ativas", `${uso.agendas} de ${uso.max_agendas ?? "sem limite"}`]);
  linhas.push(["Mensagens no período", `${uso.mensagens} de ${max ?? "sem limite"}`]);

  return (
    <>
      <h2 className="text-lg font-semibold">Seu plano</h2>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo} className="contents">
            <dt className="text-noite/65">{rotulo}</dt>
            <dd className="font-medium">{valor}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
