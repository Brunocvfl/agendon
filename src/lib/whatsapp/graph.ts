// Resposta da Cloud API (Graph) ao enviar: deu certo (id da mensagem), falhou de vez ou vale tentar de novo.

export type ResultadoEnvio =
  | { ok: true; wamid: string }
  | { ok: false; tentarDepois: boolean; erro: string };

// Limite de chamadas e instabilidade da Meta: passam sozinhos, vale tentar de novo.
const CODIGOS_TEMPORARIOS = new Set([1, 2, 4, 17, 32, 613, 80007, 130429, 131016, 131056, 133004]);

const objeto = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};

export function lerRespostaDaMeta(http: number, corpo: unknown): ResultadoEnvio {
  const c = objeto(corpo);
  const wamid = objeto(Array.isArray(c.messages) ? c.messages[0] : null).id;
  if (http >= 200 && http < 300 && typeof wamid === "string" && wamid) return { ok: true, wamid };

  const e = objeto(c.error);
  const codigo = typeof e.code === "number" ? e.code : null;
  const mensagem = typeof e.message === "string" ? e.message : "";
  // Sem número de telefone nem outro dado pessoal no que fica gravado.
  const erro = [codigo ?? `http ${http}`, mensagem].filter(Boolean).join(": ").replace(/\d{8,}/g, "…").slice(0, 200);
  const tentarDepois = http === 429 || http >= 500 || (codigo !== null && CODIGOS_TEMPORARIOS.has(codigo));
  return { ok: false, tentarDepois, erro };
}
