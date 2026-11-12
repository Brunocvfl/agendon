// Leitura do que a Meta manda no webhook: status das mensagens enviadas e respostas dos clientes.
// Só interessa o que o AgendOn usa: status (enviada, entregue, lida, falhou) e o pedido SAIR.
// Nada daqui guarda texto de cliente nem telefone além do necessário para o opt-out.

export type StatusMensagem = "enviada" | "entregue" | "lida" | "falhou";

export type StatusMeta = { wamid: string; status: StatusMensagem; erro: string | null };

export type EventosWhatsApp = {
  statuses: StatusMeta[];
  /** Quem pediu SAIR: as formas possíveis do número (E.164) de cada pessoa. */
  saidas: string[][];
};

const STATUS_DA_META: Record<string, StatusMensagem> = {
  sent: "enviada",
  delivered: "entregue",
  read: "lida",
  failed: "falhou",
};

const PALAVRAS_DE_SAIDA = new Set(["sair", "parar", "stop"]);

/** "  Sair! " -> true. Ignora maiúsculas, acentos e pontuação. */
export function ehPedidoDeSaida(texto: string): boolean {
  const limpo = texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return PALAVRAS_DE_SAIDA.has(limpo);
}

/**
 * Número que a Meta manda (só dígitos, "5511987654321") -> formas E.164 que podem estar no cadastro.
 * Em celular brasileiro a Meta às vezes manda sem o 9 depois do DDD: devolve as duas formas.
 */
export function candidatosDeTelefone(waId: string): string[] {
  const digitos = waId.replace(/\D/g, "");
  const formas = new Set<string>();
  if (digitos.length >= 8 && digitos.length <= 15) formas.add(`+${digitos}`);

  if (digitos.startsWith("55")) {
    const nacional = digitos.slice(2);
    if (nacional.length === 10 && /^[1-9][1-9][6-9]/.test(nacional)) {
      formas.add(`+55${nacional.slice(0, 2)}9${nacional.slice(2)}`); // sem o 9 -> com o 9
    } else if (nacional.length === 11 && nacional[2] === "9") {
      formas.add(`+55${nacional.slice(0, 2)}${nacional.slice(3)}`); // com o 9 -> sem o 9
    }
  }
  return [...formas].filter((t) => /^\+[1-9][0-9]{7,14}$/.test(t));
}

const texto = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const objeto = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};

/** Erro curto, sem dado pessoal: "131026: Message undeliverable" (números longos viram "…"). */
function erroDoStatus(status: Record<string, unknown>): string | null {
  const e = objeto(lista(status.errors)[0]);
  const codigo = typeof e.code === "number" || typeof e.code === "string" ? String(e.code) : null;
  const titulo = texto(e.title) ?? texto(e.message);
  if (!codigo && !titulo) return null;
  return [codigo, titulo].filter(Boolean).join(": ").replace(/\d{8,}/g, "…").slice(0, 200);
}

export function lerEventos(corpo: unknown): EventosWhatsApp {
  const eventos: EventosWhatsApp = { statuses: [], saidas: [] };

  for (const entrada of lista(objeto(corpo).entry)) {
    for (const mudanca of lista(objeto(entrada).changes)) {
      const valor = objeto(objeto(mudanca).value);

      for (const item of lista(valor.statuses)) {
        const s = objeto(item);
        const wamid = texto(s.id);
        const status = STATUS_DA_META[String(s.status)];
        if (wamid && status) eventos.statuses.push({ wamid, status, erro: status === "falhou" ? erroDoStatus(s) : null });
      }

      for (const item of lista(valor.messages)) {
        const m = objeto(item);
        const de = texto(m.from);
        const conteudo = m.type === "button" ? texto(objeto(m.button).text) : texto(objeto(m.text).body);
        if (de && conteudo && ehPedidoDeSaida(conteudo)) {
          const formas = candidatosDeTelefone(de);
          if (formas.length > 0) eventos.saidas.push(formas);
        }
      }
    }
  }
  return eventos;
}
