// Formatação para exibição (pt-BR) e leitura de valores digitados.

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarPreco(valor: number) {
  return BRL.format(valor);
}

// 45 -> "45 min"; 60 -> "1 h"; 90 -> "1 h 30 min"
export function formatarDuracao(minutos: number) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// Aceita "90", "90,5", "90,50", "1.234,50", "R$ 90". Devolve null se não for um valor válido.
export function lerPreco(texto: string): number | null {
  let limpo = texto.replace(/[^\d,.]/g, "");
  if (!limpo) return null;
  if (limpo.includes(",")) {
    limpo = limpo.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    limpo = limpo.replace(/\./g, ""); // "1.234" = mil duzentos e trinta e quatro
  }
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  const valor = Number(limpo);
  return Number.isFinite(valor) ? valor : null;
}

// "Ana Lima" -> "AL"
export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const letras = partes.length > 1 ? partes[0][0] + partes[partes.length - 1][0] : (partes[0] ?? "").slice(0, 2);
  return letras.toUpperCase();
}

// "+5511987654321" -> "(11) 98765-4321"; "+551134567890" -> "(11) 3456-7890"; outros países ficam em E.164.
export function formatarTelefone(e164: string) {
  const br = /^\+55(\d{2})(\d{4,5})(\d{4})$/.exec(e164);
  return br ? `(${br[1]}) ${br[2]}-${br[3]}` : e164;
}

// Link para conversar no WhatsApp (wa.me usa só os dígitos).
export function linkWhatsApp(e164: string) {
  return `https://wa.me/${e164.replace(/\D/g, "")}`;
}

// Status do agendamento como aparece para o salão.
export const NOME_STATUS = {
  agendado: "agendado",
  confirmado: "confirmado",
  concluido: "concluído",
  faltou: "faltou",
  cancelado: "cancelado",
} as const;

// Mensagens do WhatsApp como aparecem para o salão (status de message_log).
export const NOME_STATUS_MENSAGEM: Record<string, string> = {
  na_fila: "na fila para envio",
  enviando: "enviando",
  enviada: "enviada",
  entregue: "entregue",
  lida: "lida",
  falhou: "não enviada",
};

export const NOME_TIPO_MENSAGEM: Record<string, string> = {
  confirmacao: "Confirmação",
  lembrete_1d: "Lembrete (1 dia antes)",
  lembrete_2h: "Lembrete (2 horas antes)",
  cancelamento: "Aviso de cancelamento",
};

// Datas no fuso do salão, no formato curto do painel: "03 nov" e "nov/2026".
function partes(iso: string, fuso: string, o: Intl.DateTimeFormatOptions) {
  const p = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, ...o }).formatToParts(new Date(iso));
  const valor = (t: Intl.DateTimeFormatPartTypes) => (p.find((x) => x.type === t)?.value ?? "").replace(".", "");
  return { dia: valor("day"), mes: valor("month"), ano: valor("year") };
}

export function formatarDiaMes(iso: string, fuso: string) {
  const { dia, mes } = partes(iso, fuso, { day: "2-digit", month: "short" });
  return `${dia} ${mes}`;
}

export function formatarData(iso: string, fuso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}

export function formatarMesAno(iso: string, fuso: string) {
  const { mes, ano } = partes(iso, fuso, { month: "short", year: "numeric" });
  return `${mes}/${ano}`;
}
