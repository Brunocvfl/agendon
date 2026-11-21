// Planos (AGE-15): nomes, o uso que vem de meu_plano() e o aviso que o painel mostra ao Dono(a).
// Os limites moram no banco (subscriptions); aqui só a leitura e o texto.

export type Plano = "teste" | "essencial" | "salao" | "salao_mais" | "sob_consulta" | "cortesia";

export const NOME_DO_PLANO: Record<Plano, string> = {
  teste: "Teste grátis",
  essencial: "Essencial",
  salao: "Salão",
  salao_mais: "Salão+",
  sob_consulta: "Sob consulta",
  cortesia: "Cortesia",
};

/** Planos que se assinam (o resto é teste, cortesia ou combinado à mão). */
export type PlanoPago = "essencial" | "salao" | "salao_mais";
export type Ciclo = "mensal" | "anual";

/** Preço mensal de cada plano (decisão de 2026-11-20, AGE-12). Limites no banco: app.limites_do_plano. */
export const PRECO_MENSAL: Record<PlanoPago, number> = { essencial: 39.9, salao: 89.9, salao_mais: 169.9 };
/** Desconto do anual. */
export const DESCONTO_ANUAL = 0.2;
/** Pacote extra de mensagens (AGE-30): vale até o fim do mês da compra. */
export const PACOTE_EXTRA = { mensagens: 200, preco: 14.9 } as const;

/** Os planos que se assinam, na ordem da tela. */
export const PLANOS_PAGOS: readonly PlanoPago[] = ["essencial", "salao", "salao_mais"];
/** Agendas e mensagens de cada plano pago: espelho de app.limites_do_plano (mudou lá? mude aqui). */
export const LIMITES_DO_PLANO: Record<PlanoPago, { agendas: number; mensagens: number }> = {
  essencial: { agendas: 1, mensagens: 300 },
  salao: { agendas: 5, mensagens: 1200 },
  salao_mais: { agendas: 15, mensagens: 3000 },
};

export const ehPlanoPago = (p: unknown): p is PlanoPago => p === "essencial" || p === "salao" || p === "salao_mais";
export const ehCiclo = (c: unknown): c is Ciclo => c === "mensal" || c === "anual";

const centavos = (v: number) => Math.round(v * 100) / 100;

/** Quanto se paga por um ciclo do plano (anual = 12 meses com desconto). */
export function precoDoCiclo(plano: PlanoPago, ciclo: Ciclo): number {
  const mensal = PRECO_MENSAL[plano];
  return ciclo === "mensal" ? mensal : centavos(mensal * 12 * (1 - DESCONTO_ANUAL));
}

/** O que meu_plano() devolve. */
export type UsoDoPlano = {
  plano: Plano;
  teste_ate: string | null;
  teste_encerrado: boolean;
  max_agendas: number | null;
  agendas: number;
  max_mensagens: number | null;
  mensagens: number;
  // Cobrança (migration 29). Opcionais para os testes do aviso, que não dependem deles.
  situacao?: Situacao;
  ciclo?: Ciclo | null;
  forma?: "cartao" | "avulso" | null;
  pago_ate?: string | null;
  mensagens_extras?: number;
};

/** app.situacao_cobranca (AGE-13). */
export type Situacao = "em_dia" | "tolerancia" | "leitura" | "pagina_fechada" | "suspensa" | "teste_encerrado";

export const NOME_DA_SITUACAO: Record<Situacao, string> = {
  em_dia: "Em dia",
  tolerancia: "Pagamento atrasado",
  leitura: "Atrasado: mensagens do WhatsApp paradas",
  pagina_fechada: "Atrasado: página de agendamento fechada",
  suspensa: "Conta suspensa",
  teste_encerrado: "Teste grátis encerrado",
};

/** Texto do erro `limite_de_agendas` (P0001) ao cadastrar ou reativar uma agenda. */
export const ERRO_LIMITE_DE_AGENDAS =
  "Seu plano chegou ao limite de agendas ativas. Desative outra agenda ou fale com a gente para trocar de plano.";

export const ehLimiteDeAgendas = (e: { message?: string }) => e.message?.includes("limite_de_agendas") ?? false;

export type AvisoDoPlano = { tom: "info" | "alerta"; titulo: string; texto: string };

const DIA_MS = 24 * 60 * 60 * 1000;

/** Dias que faltam no teste (arredonda para cima: 1 h restante = 1 dia). */
export function diasRestantes(testeAte: string, agora: Date): number {
  return Math.max(0, Math.ceil((new Date(testeAte).getTime() - agora.getTime()) / DIA_MS));
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Aviso do plano no início do painel, ou null quando não há nada a dizer. */
export function avisoDoPlano(uso: UsoDoPlano, agora: Date): AvisoDoPlano | null {
  const { plano, max_mensagens: max, mensagens } = uso;

  if (plano === "teste") {
    if (uso.teste_encerrado || !uso.teste_ate || diasRestantes(uso.teste_ate, agora) === 0) {
      return {
        tom: "alerta",
        titulo: "Seu teste grátis terminou",
        texto:
          "A página de agendamento não aceita novos horários e as mensagens do WhatsApp pararam. O painel continua funcionando.",
      };
    }
    const dias = diasRestantes(uso.teste_ate, agora);
    const msgs = max === null ? "" : ` Mensagens de confirmação: ${mensagens} de ${max}.`;
    return {
      tom: dias <= 5 || (max !== null && mensagens >= max) ? "alerta" : "info",
      titulo: `Teste grátis: ${dias === 1 ? "falta 1 dia" : `faltam ${dias} dias`}`,
      texto: `${plural(uso.agendas, "agenda ativa", "agendas ativas")} de ${uso.max_agendas ?? "∞"}.${msgs}`,
    };
  }

  if (max === null || max === 0) return null;
  if (mensagens >= max) {
    return {
      tom: "alerta",
      titulo: "As mensagens do mês acabaram",
      texto: `Você usou ${mensagens} de ${max} mensagens. Os lembretes estão pausados até o mês virar; as confirmações seguem por mais alguns agendamentos.`,
    };
  }
  if (mensagens >= max * 0.8) {
    return {
      tom: "alerta",
      titulo: "As mensagens do mês estão acabando",
      texto: `Você já usou ${mensagens} de ${max} mensagens do WhatsApp neste mês.`,
    };
  }
  return null;
}
