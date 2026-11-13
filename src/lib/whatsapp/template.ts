// Templates do WhatsApp (categoria utilidade, pt_BR). Os dois têm as mesmas cinco variáveis, na mesma ordem:
// {{1}} nome do cliente, {{2}} salão, {{3}} serviço, {{4}} profissional, {{5}} dia e hora no fuso do salão.
//
// Confirmação (`confirmacao_agendamento_v2`, gatilho `app.enfileirar_confirmacao`):
//   Olá, {{1}}! Seu horário no {{2}} está confirmado: {{3}} com {{4}}, {{5}}.
//   Se precisar mudar ou cancelar, fale com o salão. Até breve!
//
// Lembrete (`lembrete_agendamento`, `app.enfileirar_lembretes`, antecedência em `salons.lembrete_horas`):
//   Olá, {{1}}! Passando para lembrar do seu horário no {{2}}: {{3}} com {{4}}, {{5}}.
//   Se precisar mudar ou cancelar, fale com o salão. Até lá!
//
// Sem texto de descadastro: o v1 da confirmação tinha "responda SAIR" e a Meta o reclassificou como
// marketing. O SAIR continua valendo pelo webhook.
// Mudou o texto ou a ordem das variáveis? Crie um template novo na Meta (versão nova do nome) e atualize
// aqui e na função que enfileira (nova migration). Template curto com muitas variáveis é recusado
// (proporção palavras/parâmetros).
import { dataNoFuso, minutosNoFuso, paraHora, rotuloData } from "@/lib/datas";

export const IDIOMA = "pt_BR";

export type DadosMensagem = {
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
export function montarMensagem(template: string, telefone: string, d: DadosMensagem) {
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

/** Texto que o cliente recebe, para a prévia no painel (o que vale é o aprovado na Meta). */
export const TEXTOS = {
  confirmacao: (d: DadosMensagem) =>
    `Olá, ${d.nome}! Seu horário no ${d.salao} está confirmado: ${d.servico} com ${d.profissional}, ${quando(d.inicio, d.fuso)}. Se precisar mudar ou cancelar, fale com o salão. Até breve!`,
  lembrete: (d: DadosMensagem) =>
    `Olá, ${d.nome}! Passando para lembrar do seu horário no ${d.salao}: ${d.servico} com ${d.profissional}, ${quando(d.inicio, d.fuso)}. Se precisar mudar ou cancelar, fale com o salão. Até lá!`,
};
