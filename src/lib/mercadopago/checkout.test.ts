import { describe, expect, it } from "vitest";
import type { UsoDoPlano } from "@/lib/regras/plano";
import { conferirPedido, iniciarCheckout, lerPedido, montarPreferencia, type ApiDeCheckout, type Preferencia } from "./checkout";
import { lerReferencia } from "./referencia";

const SALAO = "11111111-1111-4111-8111-111111111111";
const AGORA = new Date("2026-11-21T12:00:00Z");
const uso = (u: Partial<UsoDoPlano> = {}): UsoDoPlano => ({
  plano: "teste",
  teste_ate: "2026-12-21T00:00:00Z",
  teste_encerrado: false,
  max_agendas: 15,
  agendas: 1,
  max_mensagens: 10,
  mensagens: 0,
  ...u,
});

describe("lerPedido", () => {
  it("aceita plano + período e pacote", () => {
    expect(lerPedido({ tipo: "avulso", plano: "salao", ciclo: "anual" })).toEqual({
      ok: true,
      valor: { tipo: "avulso", plano: "salao", ciclo: "anual" },
    });
    expect(lerPedido({ tipo: "pacote", plano: "", ciclo: "" })).toEqual({ ok: true, valor: { tipo: "pacote" } });
  });

  it("recusa o que não está no catálogo", () => {
    for (const c of [
      { tipo: "avulso", plano: "cortesia", ciclo: "mensal" },
      { tipo: "avulso", plano: "salao", ciclo: "semanal" },
      { tipo: "assinatura", plano: "salao", ciclo: "mensal" },
      { tipo: "", plano: "", ciclo: "" },
    ]) {
      expect(lerPedido(c).ok).toBe(false);
    }
  });
});

describe("conferirPedido", () => {
  const essencial = { tipo: "avulso", plano: "essencial", ciclo: "mensal" } as const;
  it("plano menor que as agendas ativas não pode", () => {
    expect(conferirPedido(essencial, uso({ agendas: 2 }))).toBe("agendas_demais");
    expect(conferirPedido(essencial, uso({ agendas: 1 }))).toBeNull();
    expect(conferirPedido({ ...essencial, plano: "salao" }, uso({ agendas: 5 }))).toBeNull();
  });
  it("cortesia e sob consulta não compram por aqui", () => {
    expect(conferirPedido(essencial, uso({ plano: "cortesia" }))).toBe("plano_combinado");
    expect(conferirPedido({ tipo: "pacote" }, uso({ plano: "sob_consulta" }))).toBe("plano_combinado");
  });
  it("pacote só com plano pago", () => {
    expect(conferirPedido({ tipo: "pacote" }, uso())).toBe("sem_plano_pago");
    expect(conferirPedido({ tipo: "pacote" }, uso({ plano: "salao" }))).toBeNull();
  });
});

describe("montarPreferencia", () => {
  it("referência, valor, retorno e aviso saem do servidor", () => {
    const p = montarPreferencia(SALAO, { tipo: "avulso", plano: "salao", ciclo: "anual" }, "https://agendon.app.br", AGORA);
    expect(lerReferencia(p.external_reference)).toEqual({ salao: SALAO, tipo: "avulso", plano: "salao", ciclo: "anual" });
    expect(p.items).toEqual([expect.objectContaining({ unit_price: 863.04, currency_id: "BRL", quantity: 1 })]);
    expect(p.notification_url).toBe("https://agendon.app.br/api/mercadopago/webhook?source_news=webhooks");
    expect(p.back_urls.success).toBe("https://agendon.app.br/painel/configuracoes/plano?retorno=aprovado");
    expect(p.payment_methods.installments).toBe(1);
    expect(p.expiration_date_to).toBe("2026-11-22T12:00:00.000Z");
  });

  it("pacote", () => {
    const p = montarPreferencia(SALAO, { tipo: "pacote" }, "https://agendon.app.br", AGORA);
    expect(lerReferencia(p.external_reference)).toEqual({ salao: SALAO, tipo: "pacote" });
    expect(p.items[0].unit_price).toBe(14.9);
  });

  it("sem HTTPS (computador local) não pede aviso", () => {
    const p = montarPreferencia(SALAO, { tipo: "pacote" }, "http://localhost:3000", AGORA);
    expect("notification_url" in p).toBe(false);
  });
});

describe("iniciarCheckout", () => {
  const entrada = { salao: SALAO, pedido: { tipo: "avulso", plano: "essencial", ciclo: "mensal" } as const, origem: "https://x.app.br", agora: AGORA };
  const mp = (url = "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=1"): ApiDeCheckout & { corpos: Preferencia[] } => {
    const corpos: Preferencia[] = [];
    return { corpos, criarPreferencia: async (c) => (corpos.push(c), url) };
  };

  it("devolve o link do Mercado Pago", async () => {
    const api = mp();
    const r = await iniciarCheckout(entrada, { uso: async () => uso(), mp: api });
    expect(r).toEqual({ ok: true, data: { url: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=1" } });
    expect(api.corpos).toHaveLength(1);
  });

  it("não chama o MP se o pedido não cabe", async () => {
    const api = mp();
    expect(await iniciarCheckout(entrada, { uso: async () => uso({ agendas: 3 }), mp: api })).toEqual({ ok: false, erro: "agendas_demais" });
    expect(api.corpos).toHaveLength(0);
  });

  it("sem token ou com o MP fora do ar: indisponível", async () => {
    expect(await iniciarCheckout(entrada, { uso: async () => uso(), mp: null })).toEqual({ ok: false, erro: "indisponivel" });
    const quebrado: ApiDeCheckout = { criarPreferencia: async () => Promise.reject(new Error("mercadopago: 500")) };
    const erro = console.error;
    console.error = () => {};
    try {
      expect(await iniciarCheckout(entrada, { uso: async () => uso(), mp: quebrado })).toEqual({ ok: false, erro: "indisponivel" });
    } finally {
      console.error = erro;
    }
  });
});
