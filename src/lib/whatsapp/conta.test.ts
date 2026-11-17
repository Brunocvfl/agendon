import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { criarModeloConfirmacaoV3, ehAdminDaPlataforma, lerConta, MODELO_CONFIRMACAO_V3 } from "./conta";

const credenciais = { token: "tk", numeroId: "111", wabaId: "222", versao: "v23.0" };

type Pedido = { url: string; init?: RequestInit };
function metaFalsa(respostas: Record<string, { status?: number; corpo: unknown }>) {
  const pedidos: Pedido[] = [];
  const fetch = (async (url: string, init?: RequestInit) => {
    pedidos.push({ url, init });
    const chave = Object.keys(respostas).find((k) => url.includes(k));
    const r = chave ? respostas[chave] : { status: 404, corpo: { error: { code: 100, message: "não existe" } } };
    return new Response(JSON.stringify(r.corpo), { status: r.status ?? 200 });
  }) as typeof globalThis.fetch;
  return { fetch, pedidos };
}

describe("administrador da plataforma", () => {
  it("aceita e-mail da lista, sem diferença de maiúsculas e espaços", () => {
    expect(ehAdminDaPlataforma("Ana@X.com", " ana@x.com , bia@y.com")).toBe(true);
    expect(ehAdminDaPlataforma("bia@y.com", "ana@x.com,bia@y.com")).toBe(true);
  });
  it("recusa e-mail fora da lista, lista vazia e usuário sem e-mail", () => {
    expect(ehAdminDaPlataforma("eva@z.com", "ana@x.com")).toBe(false);
    expect(ehAdminDaPlataforma("ana@x.com", "")).toBe(false);
    expect(ehAdminDaPlataforma(null, "ana@x.com")).toBe(false);
  });
});

describe("lerConta", () => {
  it("sem credenciais não chama a Meta", async () => {
    const { fetch, pedidos } = metaFalsa({});
    expect(await lerConta({ fetch, credenciais: { token: "tk" } })).toBeNull();
    expect(pedidos).toHaveLength(0);
  });

  it("lê número, modelos e webhook com o token no cabeçalho", async () => {
    const { fetch, pedidos } = metaFalsa({
      "/111?": {
        corpo: {
          display_phone_number: "+55 11 95713-1962",
          verified_name: "AgendOn",
          status: "CONNECTED",
          quality_rating: "GREEN",
          messaging_limit_tier: "TIER_250",
          name_status: "PENDING_REVIEW",
        },
      },
      "/222/message_templates": {
        corpo: { data: [{ id: "9", name: "lembrete_agendamento", status: "APPROVED", category: "UTILITY", language: "pt_BR" }] },
      },
      "/222/subscribed_apps": { corpo: { data: [{ whatsapp_business_api_data: { id: "77", name: "AgendOn" } }] } },
    });
    const conta = await lerConta({ fetch, credenciais });
    expect(conta?.numero).toMatchObject({ ok: true, dados: { telefone: "+55 11 95713-1962", qualidade: "GREEN", statusNome: "PENDING_REVIEW" } });
    expect(conta?.modelos).toMatchObject({ ok: true, dados: [{ nome: "lembrete_agendamento", status: "APPROVED" }] });
    expect(conta?.webhook).toMatchObject({ ok: true, dados: [{ id: "77", nome: "AgendOn" }] });
    expect(pedidos).toHaveLength(3);
    for (const p of pedidos) {
      expect(p.url.startsWith("https://graph.facebook.com/v23.0/")).toBe(true);
      expect(new Headers(p.init?.headers).get("authorization")).toBe("Bearer tk");
    }
    // A tela mostra o caminho, nunca o token.
    expect(JSON.stringify(conta)).not.toContain("tk");
  });

  it("erro da Meta numa leitura não derruba as outras", async () => {
    const { fetch } = metaFalsa({
      "/111?": { status: 400, corpo: { error: { code: 190, message: "token inválido" } } },
      "/222/message_templates": { corpo: { data: [] } },
      "/222/subscribed_apps": { corpo: { data: [] } },
    });
    const conta = await lerConta({ fetch, credenciais });
    expect(conta?.numero).toMatchObject({ ok: false, erro: "190: token inválido" });
    expect(conta?.modelos).toMatchObject({ ok: true, dados: [] });
  });
});

describe("criarModeloConfirmacaoV3", () => {
  it("envia o modelo v3 em UTF-8 e devolve id e status", async () => {
    const { fetch, pedidos } = metaFalsa({
      "/222/message_templates": { corpo: { id: "55", status: "PENDING", category: "UTILITY" } },
    });
    expect(await criarModeloConfirmacaoV3({ fetch, credenciais })).toEqual({ ok: true, id: "55", status: "PENDING" });
    expect(pedidos[0].init?.method).toBe("POST");
    const corpo = JSON.parse(String(pedidos[0].init?.body));
    expect(corpo).toEqual(MODELO_CONFIRMACAO_V3);
    expect(corpo.components[0].text).toContain("Olá, {{1}}! Seu horário");
  });

  it("devolve a mensagem da Meta quando recusa", async () => {
    const { fetch } = metaFalsa({
      "/222/message_templates": {
        status: 400,
        corpo: { error: { code: 100, message: "Invalid parameter", error_user_msg: "Já existe um modelo com esse nome" } },
      },
    });
    expect(await criarModeloConfirmacaoV3({ fetch, credenciais })).toEqual({
      ok: false,
      erro: "100: Já existe um modelo com esse nome",
    });
  });
});
