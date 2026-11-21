"use server";

import { headers } from "next/headers";
import { acaoDoPainel, texto, type EstadoForm } from "@/lib/acao";
import { iniciarCheckout, lerPedido } from "@/lib/mercadopago/checkout";
import { checkoutMercadoPago } from "@/lib/mercadopago/servidor";
import { origemDosCabecalhos } from "@/lib/origem";
import { carregarPlano } from "./dados";

export type { EstadoForm };

// Cria o checkout no Mercado Pago e manda a pessoa para lá. Salão, valor e referência saem do servidor.
export const comprar = acaoDoPainel({
  permissao: "gerenciar-salao",
  ler: (fd) => lerPedido({ tipo: texto(fd, "tipo"), plano: texto(fd, "plano"), ciclo: texto(fd, "ciclo") }),
  executar: async (pedido, { vinculo }) =>
    iniciarCheckout(
      { salao: vinculo.salao.id, pedido, origem: origemDosCabecalhos(await headers()), agora: new Date() },
      { uso: () => carregarPlano(vinculo.salao.id), mp: checkoutMercadoPago() },
    ),
  mensagens: {
    plano_combinado: "Seu plano foi combinado com a gente. Para mudar, fale com a gente pela página de contato.",
    agendas_demais:
      "Esse plano tem menos agendas do que as que você usa hoje. Desative agendas em Profissionais ou escolha um plano maior.",
    sem_plano_pago: "O pacote extra é para quem já tem um plano pago. Escolha um plano primeiro.",
    indisponivel: "Não foi possível abrir o pagamento agora. Tente de novo em instantes.",
  },
  depois: { ir: (data) => data.url },
});
