// Template da confirmação (categoria utilidade, pt_BR). O texto aprovado na Meta é:
//
//   Olá, {{1}}! Seu horário no {{2}} está confirmado: {{3}} com {{4}}, {{5}}.
//   Se precisar mudar ou cancelar, fale com o salão. Até breve!
//
// Nome do template: confirmacao_agendamento_v2 (o v1 tinha "responda SAIR" e a Meta o reclassificou como
// marketing; texto de descadastro em template de utilidade faz isso). O SAIR continua valendo pelo webhook.
// Mudou o texto ou a ordem das variáveis? Crie um template novo na Meta (versão nova do nome) e atualize
// aqui e no gatilho `app.enfileirar_confirmacao` (nova migration). Template curto com muitas variáveis é
// recusado (proporção palavras/parâmetros).
import { dataNoFuso, minutosNoFuso, paraHora, rotuloData } from "@/lib/datas";

export const IDIOMA = "pt_BR";

export type DadosConfirmacao = {
  nome: string;
  salao: string;
  servico: string;
  profissional: string;
  /** Instante de início (ISO). */
  inicio: string;
  fuso: string;
};

/** A Meta recusa variável vazia, com quebra de linha, tabulação ou 4+ espaços seguidos. */
export function parametro(texto: string, max = 60): string {
  const limpo = texto.replace(/\s+/g, " ").trim().slice(0, max).trim();
  return limpo || "-";
}

/** "qui, 12 nov às 15:30" no fuso do salão. */
export function quando(inicio: string, fuso: string): string {
  return `${rotuloData(dataNoFuso(inicio, fuso))} às ${paraHora(minutosNoFuso(inicio, fuso))}`;
}

/** Corpo do POST /{phone-number-id}/messages da Cloud API. `telefone` em E.164 ("+5511987654321"). */
export function montarConfirmacao(template: string, telefone: string, d: DadosConfirmacao) {
  const textos = [d.nome, d.salao, d.servico, d.profissional, quando(d.inicio, d.fuso)];
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: telefone.replace(/\D/g, ""),
    type: "template",
    template: {
      name: template,
      language: { code: IDIOMA },
      components: [{ type: "body", parameters: textos.map((t) => ({ type: "text", text: parametro(t) })) }],
    },
  };
}
