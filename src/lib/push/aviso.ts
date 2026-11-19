// Texto do aviso de agendamento novo: só o nome de quem será atendido e o serviço (decisão de
// 2026-11-19). Puro: usado pelo envio (Web Push) e pela lista em /painel/notificacoes.

export type Aviso = {
  titulo: string;
  corpo: string;
  /** Abre o agendamento no painel. */
  url: string;
  /** Um aviso por agendamento no aparelho (repetido substitui). */
  tag: string;
};

export const TITULO_NOVO_AGENDAMENTO = "Novo agendamento";

/** "Maria · Corte feminino" (sem nada além do nome e do serviço). */
export function corpoDoAviso(cliente: string, servico: string): string {
  return `${cliente.trim()} · ${servico.trim()}`;
}

export function avisoDeAgendamento(a: { appointmentId: string; cliente: string; servico: string }): Aviso {
  return {
    titulo: TITULO_NOVO_AGENDAMENTO,
    corpo: corpoDoAviso(a.cliente, a.servico),
    url: `/painel/agenda/${a.appointmentId}`,
    tag: `agendamento-${a.appointmentId}`,
  };
}
