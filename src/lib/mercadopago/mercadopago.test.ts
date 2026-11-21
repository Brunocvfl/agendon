import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { assinaturaValida, lerCabecalhoDeAssinatura, manifesto } from "./assinatura";
import { aplicarNotificacao, type ApiMercadoPago, type BancoDeCobranca, type PagamentoMP, type RegistroDePagamento } from "./cobranca";
import { lerReferencia, montarReferencia } from "./referencia";

const SALAO = "11111111-1111-4111-8111-111111111111";

describe("referência externa", () => {
  it("ida e volta", () => {
    const compras = [
      { salao: SALAO, tipo: "avulso", plano: "salao", ciclo: "anual" },
      { salao: SALAO, tipo: "assinatura", plano: "essencial", ciclo: "mensal" },
      { salao: SALAO, tipo: "pacote" },
    ] as const;
    for (const c of compras) expect(lerReferencia(montarReferencia(c))).toEqual(c);
  });

  it("recusa o que não é nosso ou está incompleto", () => {
    for (const ref of [
      null,
      "",
      "pedido-123",
      `agendon:v1:nao-e-uuid:pacote`,
      `agendon:v2:${SALAO}:pacote`,
      `agendon:v1:${SALAO}:avulso:cortesia:mensal`,
      `agendon:v1:${SALAO}:avulso:salao:semanal`,
      `agendon:v1:${SALAO}:avulso:salao`,
      `agendon:v1:${SALAO}:pacote:extra`,
    ]) {
      expect(lerReferencia(ref)).toBeNull();
    }
  });
});

describe("assinatura do webhook", () => {
  const segredo = "segredo-de-teste";
  const assinar = (m: string) => createHmac("sha256", segredo).update(m).digest("hex");

  it("lê o cabeçalho", () => {
    expect(lerCabecalhoDeAssinatura(`ts=1704908010,v1=${"a".repeat(64)}`)).toEqual({ ts: "1704908010", v1: "a".repeat(64) });
    expect(lerCabecalhoDeAssinatura("ts=abc,v1=123")).toBeNull();
    expect(lerCabecalhoDeAssinatura(null)).toBeNull();
  });

  it("monta o manifesto (id em minúsculas, partes ausentes de fora)", () => {
    expect(manifesto("123", "req-1", "99")).toBe("id:123;request-id:req-1;ts:99;");
    expect(manifesto("ABC1", null, "99")).toBe("id:abc1;ts:99;");
  });

  it("confere o HMAC", () => {
    const v1 = assinar("id:123;request-id:req-1;ts:99;");
    const ok = { cabecalho: `ts=99,v1=${v1}`, requestId: "req-1", dataId: "123" };
    expect(assinaturaValida(ok, segredo)).toBe(true);
    expect(assinaturaValida({ ...ok, dataId: "124" }, segredo)).toBe(false);
    expect(assinaturaValida({ ...ok, requestId: "req-2" }, segredo)).toBe(false);
    expect(assinaturaValida(ok, "outro")).toBe(false);
    expect(assinaturaValida(ok, undefined)).toBe(false);
  });
});

describe("aplicarNotificacao", () => {
  const pagamento = (p: Partial<PagamentoMP>): PagamentoMP => ({
    id: 555,
    status: "approved",
    transaction_amount: 89.9,
    currency_id: "BRL",
    external_reference: `agendon:v1:${SALAO}:avulso:salao:mensal`,
    ...p,
  });
  const montar = (p: PagamentoMP | null) => {
    const registros: RegistroDePagamento[] = [];
    const mp: ApiMercadoPago = { pagamento: async () => p };
    const banco: BancoDeCobranca = {
      registrarPagamento: async (r) => {
        registros.push(r);
        return true;
      },
    };
    return { registros, deps: { mp, banco } };
  };

  it("registra o pagamento com o que a referência diz", async () => {
    const { registros, deps } = montar(pagamento({}));
    expect(await aplicarNotificacao({ tipo: "payment", id: "555" }, deps)).toEqual({ ok: true, aplicado: true });
    expect(registros).toEqual([
      { salao: SALAO, mpId: "555", tipo: "avulso", plano: "salao", ciclo: "mensal", valor: 89.9, status: "approved" },
    ]);
  });

  it("pacote extra", async () => {
    const { registros, deps } = montar(pagamento({ transaction_amount: 14.9, external_reference: `agendon:v1:${SALAO}:pacote` }));
    await aplicarNotificacao({ tipo: "payment", id: "555" }, deps);
    expect(registros[0]).toMatchObject({ tipo: "pacote", plano: null, ciclo: null });
  });

  it("anual com desconto", async () => {
    const { registros, deps } = montar(
      pagamento({ transaction_amount: 383.04, external_reference: `agendon:v1:${SALAO}:avulso:essencial:anual` }),
    );
    expect(await aplicarNotificacao({ tipo: "payment", id: "555" }, deps)).toEqual({ ok: true, aplicado: true });
    expect(registros).toHaveLength(1);
  });

  it("não registra o que não confere", async () => {
    const casos: [PagamentoMP | null, string][] = [
      [null, "nao_encontrado"],
      [pagamento({ external_reference: "outro-sistema" }), "referencia_invalida"],
      [pagamento({ transaction_amount: 1 }), "valor_divergente"],
      [pagamento({ currency_id: "USD" }), "valor_divergente"],
    ];
    for (const [p, motivo] of casos) {
      const { registros, deps } = montar(p);
      expect(await aplicarNotificacao({ tipo: "payment", id: "555" }, deps)).toEqual({ ok: false, motivo });
      expect(registros).toHaveLength(0);
    }
  });

  it("ignora outros tipos de aviso", async () => {
    const { deps } = montar(pagamento({}));
    expect(await aplicarNotificacao({ tipo: "subscription_preapproval", id: "x" }, deps)).toEqual({ ok: false, motivo: "tipo_ignorado" });
  });
});
