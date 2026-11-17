// Conta do WhatsApp do AgendOn (WABA) pela WhatsApp Business Management API: número, modelos e
// assinatura do webhook, e a criação do modelo de confirmação v3 (acentos em UTF-8).
// Temporário (análise do app na Meta, permissão whatsapp_business_management): só administradores
// da plataforma (ADMINS_PLATAFORMA) veem a tela. Com o Tech Provider, isso vira por salão.
import "server-only";

const VERSAO_PADRAO = "v23.0";

export type CredenciaisConta = { token?: string; numeroId?: string; wabaId?: string; versao?: string };
export type DepsConta = { fetch?: typeof fetch; credenciais?: CredenciaisConta };

const credenciaisDoAmbiente = (): CredenciaisConta => ({
  token: process.env.META_ACCESS_TOKEN,
  numeroId: process.env.META_PHONE_NUMBER_ID,
  wabaId: process.env.META_WABA_ID,
  versao: process.env.META_GRAPH_VERSION,
});

/** E-mail na lista ADMINS_PLATAFORMA (separada por vírgula, sem diferença de maiúsculas). */
export function ehAdminDaPlataforma(email: string | null, lista = process.env.ADMINS_PLATAFORMA ?? ""): boolean {
  if (!email) return false;
  const admins = lista.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.trim().toLowerCase());
}

/** Pedido feito à Meta, para a tela mostrar (sem o token). */
export type Chamada = { metodo: "GET" | "POST"; caminho: string };

export type Numero = {
  telefone: string;
  nome: string;
  status: string;
  qualidade: string;
  limite: string;
  statusNome: string;
};
export type Modelo = { id: string; nome: string; status: string; categoria: string; idioma: string };
export type AppAssinado = { id: string; nome: string };

export type Leitura<T> = { chamada: Chamada; ok: true; dados: T } | { chamada: Chamada; ok: false; erro: string };

export type Conta = {
  numero: Leitura<Numero>;
  modelos: Leitura<Modelo[]>;
  webhook: Leitura<AppAssinado[]>;
};

const objeto = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
const textoDe = (v: unknown) => (typeof v === "string" ? v : "");
const lista = (v: unknown) => (Array.isArray(v) ? v.map(objeto) : []);

/** "TIER_2K" → "2.000 conversas iniciadas pela empresa a cada 24 h"; sem limite ou desconhecido, o próprio código. */
export function rotuloDoLimite(tier: string): string {
  const m = tier.match(/^TIER_(\d+)(K)?$/);
  if (m) {
    const n = Number(m[1]) * (m[2] ? 1000 : 1);
    return `${n.toLocaleString("pt-BR")} conversas iniciadas pela empresa a cada 24 h`;
  }
  return tier === "TIER_UNLIMITED" ? "Sem limite de conversas iniciadas pela empresa" : tier;
}

function erroDaMeta(http: number, corpo: unknown): string {
  const e = objeto(objeto(corpo).error);
  const msg = textoDe(e.error_user_msg) || textoDe(e.message);
  return [typeof e.code === "number" ? e.code : `http ${http}`, msg].filter(Boolean).join(": ").slice(0, 300);
}

export const lerNumero = (c: unknown): Numero => {
  const o = objeto(c);
  return {
    telefone: textoDe(o.display_phone_number),
    nome: textoDe(o.verified_name),
    status: textoDe(o.status),
    qualidade: textoDe(o.quality_rating),
    // O limite agora é da conta comercial (o mesmo do WhatsApp Manager); messaging_limit_tier é o antigo, por número.
    limite: textoDe(o.whatsapp_business_manager_messaging_limit) || textoDe(o.messaging_limit_tier),
    statusNome: textoDe(o.name_status),
  };
};

export const lerModelos = (c: unknown): Modelo[] =>
  lista(objeto(c).data).map((m) => ({
    id: textoDe(m.id),
    nome: textoDe(m.name),
    status: textoDe(m.status),
    categoria: textoDe(m.category),
    idioma: textoDe(m.language),
  }));

export const lerAssinaturas = (c: unknown): AppAssinado[] =>
  lista(objeto(c).data).map((a) => {
    const app = objeto(a.whatsapp_business_api_data);
    return { id: textoDe(app.id), nome: textoDe(app.name) };
  });

type Cliente = {
  pedir: (chamada: Chamada, corpo?: unknown) => Promise<{ ok: true; corpo: unknown } | { ok: false; erro: string }>;
  numeroId: string;
  wabaId: string;
};

function cliente(deps: DepsConta): Cliente | null {
  const { token, numeroId, wabaId, versao } = deps.credenciais ?? credenciaisDoAmbiente();
  if (!token || !numeroId || !wabaId) return null;
  const chamar = deps.fetch ?? fetch;
  const base = `https://graph.facebook.com/${versao || VERSAO_PADRAO}`;
  return {
    numeroId,
    wabaId,
    async pedir({ metodo, caminho }, corpo) {
      try {
        const resposta = await chamar(base + caminho, {
          method: metodo,
          headers: {
            Authorization: `Bearer ${token}`,
            ...(corpo === undefined ? {} : { "Content-Type": "application/json; charset=utf-8" }),
          },
          body: corpo === undefined ? undefined : JSON.stringify(corpo),
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
        });
        const json: unknown = await resposta.json().catch(() => null);
        return resposta.ok ? { ok: true, corpo: json } : { ok: false, erro: erroDaMeta(resposta.status, json) };
      } catch {
        return { ok: false, erro: "sem resposta da Meta" };
      }
    },
  };
}

async function ler<T>(c: Cliente, chamada: Chamada, ler: (corpo: unknown) => T): Promise<Leitura<T>> {
  const r = await c.pedir(chamada);
  return r.ok ? { chamada, ok: true, dados: ler(r.corpo) } : { chamada, ok: false, erro: r.erro };
}

/** Lê número, modelos e webhook em paralelo; null se faltam credenciais. */
export async function lerConta(deps: DepsConta = {}): Promise<Conta | null> {
  const c = cliente(deps);
  if (!c) return null;
  const [numero, modelos, webhook] = await Promise.all([
    ler(
      c,
      {
        metodo: "GET",
        caminho: `/${c.numeroId}?fields=display_phone_number,verified_name,status,quality_rating,whatsapp_business_manager_messaging_limit,name_status`,
      },
      lerNumero,
    ),
    ler(c, { metodo: "GET", caminho: `/${c.wabaId}/message_templates?fields=name,status,category,language&limit=50` }, lerModelos),
    ler(c, { metodo: "GET", caminho: `/${c.wabaId}/subscribed_apps` }, lerAssinaturas),
  ]);
  return { numero, modelos, webhook };
}

/** Modelo de confirmação v3: mesmo texto do v2, com os acentos em UTF-8 (o v2 foi cadastrado com "Ol?"). */
export const MODELO_CONFIRMACAO_V3 = {
  name: "confirmacao_agendamento_v3",
  language: "pt_BR",
  category: "UTILITY",
  components: [
    {
      type: "BODY",
      text: "Olá, {{1}}! Seu horário no {{2}} está confirmado: {{3}} com {{4}}, {{5}}. Se precisar mudar ou cancelar, fale com o salão. Até breve!",
      example: { body_text: [["Maria", "Studio Demo", "Corte feminino", "Ana", "sex., 21 de nov. às 14:00"]] },
    },
  ],
} as const;

export type ResultadoCriacao = { ok: true; id: string; status: string } | { ok: false; erro: string };

export async function criarModeloConfirmacaoV3(deps: DepsConta = {}): Promise<ResultadoCriacao> {
  const c = cliente(deps);
  if (!c) return { ok: false, erro: "Faltam as credenciais da Meta no servidor." };
  const r = await c.pedir({ metodo: "POST", caminho: `/${c.wabaId}/message_templates` }, MODELO_CONFIRMACAO_V3);
  if (!r.ok) return r;
  const o = objeto(r.corpo);
  return { ok: true, id: textoDe(o.id), status: textoDe(o.status) };
}
