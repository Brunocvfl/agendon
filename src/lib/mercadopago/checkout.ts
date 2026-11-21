// Checkout Pro (AGE-14, fatia 2): o Dono(a) escolhe o plano (ou o pacote extra) e paga na página do
// Mercado Pago (Pix, cartão à vista ou débito). O servidor decide o salão, o valor e a referência; o
// navegador só diz o que quer comprar. O pagamento volta pelo webhook (`notification_url` vai no próprio
// checkout: os pagamentos da conta de teste não passam pelo webhook da aplicação). Puro, com o MP injetado.
import {
  LIMITES_DO_PLANO,
  NOME_DO_PLANO,
  PACOTE_EXTRA,
  ehCiclo,
  ehPlanoPago,
  precoDoCiclo,
  type Ciclo,
  type PlanoPago,
  type UsoDoPlano,
} from "@/lib/regras/plano";
import { invalido, valido, type Resultado } from "@/lib/regras/resultado";
import { montarReferencia, type Compra } from "./referencia";

/** O que o Dono(a) pediu (sem o salão, que vem do vínculo). */
export type Pedido = { tipo: "avulso"; plano: PlanoPago; ciclo: Ciclo } | { tipo: "pacote" };

export const ERROS_DO_CHECKOUT = ["plano_combinado", "agendas_demais", "sem_plano_pago", "indisponivel"] as const;
export type ErroDoCheckout = (typeof ERROS_DO_CHECKOUT)[number];

/** Rota do painel para onde o MP devolve a pessoa. */
export const ROTA_DO_PLANO = "/painel/configuracoes/plano";
/** Um link de checkout vale por 24 h (preço trocado não fica valendo num link antigo). */
const VALIDADE_MS = 24 * 60 * 60 * 1000;

/** Lê o formulário (`tipo`, `plano`, `ciclo`). */
export function lerPedido(campos: { tipo: string; plano: string; ciclo: string }): Resultado<Pedido> {
  if (campos.tipo === "pacote") return valido({ tipo: "pacote" });
  if (campos.tipo === "avulso" && ehPlanoPago(campos.plano) && ehCiclo(campos.ciclo)) {
    return valido({ tipo: "avulso", plano: campos.plano, ciclo: campos.ciclo });
  }
  return invalido({ _geral: "Escolha um plano e o período." });
}

/** O pedido cabe no salão? null = pode comprar. */
export function conferirPedido(pedido: Pedido, uso: UsoDoPlano): ErroDoCheckout | null {
  if (uso.plano === "cortesia" || uso.plano === "sob_consulta") return "plano_combinado";
  if (pedido.tipo === "pacote") return ehPlanoPago(uso.plano) ? null : "sem_plano_pago";
  return LIMITES_DO_PLANO[pedido.plano].agendas < uso.agendas ? "agendas_demais" : null;
}

export function descricaoDaCompra(pedido: Pedido): string {
  if (pedido.tipo === "pacote") return `AgendOn: pacote de ${PACOTE_EXTRA.mensagens} mensagens`;
  return `AgendOn ${NOME_DO_PLANO[pedido.plano]} (${pedido.ciclo === "anual" ? "anual" : "mensal"})`;
}

export function valorDoPedido(pedido: Pedido): number {
  return pedido.tipo === "pacote" ? PACOTE_EXTRA.preco : precoDoCiclo(pedido.plano, pedido.ciclo);
}

/** Corpo do POST /checkout/preferences. Sem dado pessoal (nem e-mail do Dono(a)). */
export function montarPreferencia(salao: string, pedido: Pedido, origem: string, agora: Date) {
  const compra: Compra = pedido.tipo === "pacote" ? { salao, tipo: "pacote" } : { salao, ...pedido };
  const volta = (r: string) => `${origem}${ROTA_DO_PLANO}?retorno=${r}`;
  return {
    items: [
      {
        id: pedido.tipo === "pacote" ? "pacote" : `${pedido.plano}-${pedido.ciclo}`,
        title: descricaoDaCompra(pedido),
        quantity: 1,
        currency_id: "BRL",
        unit_price: valorDoPedido(pedido),
      },
    ],
    external_reference: montarReferencia(compra),
    back_urls: { success: volta("aprovado"), pending: volta("pendente"), failure: volta("falhou") },
    auto_return: "approved",
    // O MP só avisa URL pública em HTTPS (no computador local, sem aviso).
    ...(origem.startsWith("https://") ? { notification_url: `${origem}/api/mercadopago/webhook?source_news=webhooks` } : {}),
    // Pix, cartão à vista e débito; boleto fica de fora (compensa em dias). Cartão recorrente é a Assinatura.
    payment_methods: { excluded_payment_types: [{ id: "ticket" }, { id: "atm" }], installments: 1 },
    statement_descriptor: "AGENDON",
    expires: true,
    expiration_date_from: agora.toISOString(),
    expiration_date_to: new Date(agora.getTime() + VALIDADE_MS).toISOString(),
  };
}

export type Preferencia = ReturnType<typeof montarPreferencia>;

export interface ApiDeCheckout {
  /** Cria a preferência e devolve o link de pagamento (init_point). Lança erro se o MP recusar. */
  criarPreferencia(corpo: Preferencia): Promise<string>;
}

export async function iniciarCheckout(
  entrada: { salao: string; pedido: Pedido; origem: string; agora: Date },
  deps: { uso: () => Promise<UsoDoPlano | null>; mp: ApiDeCheckout | null },
): Promise<{ ok: true; data: { url: string } } | { ok: false; erro: ErroDoCheckout }> {
  if (!deps.mp) return { ok: false, erro: "indisponivel" };
  const uso = await deps.uso();
  if (!uso) return { ok: false, erro: "indisponivel" };
  const erro = conferirPedido(entrada.pedido, uso);
  if (erro) return { ok: false, erro };
  try {
    const url = await deps.mp.criarPreferencia(montarPreferencia(entrada.salao, entrada.pedido, entrada.origem, entrada.agora));
    return { ok: true, data: { url } };
  } catch (e) {
    console.error(e instanceof Error ? e.message : "mercadopago: checkout falhou");
    return { ok: false, erro: "indisponivel" };
  }
}
