// Referência externa (external_reference) dos pagamentos no Mercado Pago: quem criou o checkout foi o
// nosso servidor, então é ela que diz de qual salão é o pagamento e o que foi comprado. O webhook lê a
// referência do pagamento buscado na API do MP (nunca do corpo do aviso).
import { ehUuid } from "@/lib/ids";
import { ehCiclo, ehPlanoPago, type Ciclo, type PlanoPago } from "@/lib/regras/plano";

export type Compra =
  | { salao: string; tipo: "assinatura" | "avulso"; plano: PlanoPago; ciclo: Ciclo }
  | { salao: string; tipo: "pacote" };

const PREFIXO = "agendon:v1";

export function montarReferencia(c: Compra): string {
  return c.tipo === "pacote"
    ? `${PREFIXO}:${c.salao}:pacote`
    : `${PREFIXO}:${c.salao}:${c.tipo}:${c.plano}:${c.ciclo}`;
}

/** A compra descrita pela referência, ou null se não é uma referência nossa válida. */
export function lerReferencia(ref: string | null | undefined): Compra | null {
  if (!ref) return null;
  const partes = ref.split(":");
  if (partes.length < 4 || `${partes[0]}:${partes[1]}` !== PREFIXO || !ehUuid(partes[2])) return null;
  const [, , salao, tipo, plano, ciclo] = partes;
  if (tipo === "pacote") return partes.length === 4 ? { salao, tipo } : null;
  if ((tipo === "assinatura" || tipo === "avulso") && partes.length === 6 && ehPlanoPago(plano) && ehCiclo(ciclo)) {
    return { salao, tipo, plano, ciclo };
  }
  return null;
}
