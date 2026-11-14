import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Sem banco nem rede: a fila é falsa e o fetch devolve respostas da Meta.
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/secreto", () => ({
  clienteSecreto: () => {
    throw new Error("o teste não pode usar a chave secreta");
  },
}));

const { LOTE, processarFila, processarTudo } = await import("./enviar");
const { aplicarEventos } = await import("./eventos");
type FilaWhatsApp = import("./fila").FilaWhatsApp;
type MensagemReservada = import("./fila").MensagemReservada;

const CREDENCIAIS = { token: "t", numeroId: "123" };

const mensagem = (id: string): MensagemReservada => ({
  mensagem_id: id,
  template: "confirmacao_agendamento_v2",
  tipo: "confirmacao",
  telefone: "+5511987654321",
  cliente_nome: "Ana",
  salao: "Studio",
  servico: "Corte",
  profissional: "Bia",
  inicio: "2030-03-05T13:00:00Z",
  fuso: "America/Sao_Paulo",
});

/** Fila falsa: cada chamada a reservar devolve o próximo lote da lista. */
function filaFalsa(lotes: MensagemReservada[][]) {
  const fila = {
    reservar: vi.fn(async () => lotes.shift() ?? []),
    resultado: vi.fn(async () => {}),
    statusDaMeta: vi.fn(async () => {}),
    optout: vi.fn(async () => {}),
  } satisfies FilaWhatsApp;
  return fila;
}

const resposta = (status: number, corpo: unknown) => ({ status, json: async () => corpo }) as Response;
const sucesso = (wamid: string) => resposta(200, { messages: [{ id: wamid }] });
const erroMeta = (status: number, code: number) => resposta(status, { error: { code, message: "x" } });

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("processarFila", () => {
  it("grava o status de cada mensagem conforme a resposta da Meta e soma o resumo", async () => {
    const fila = filaFalsa([[mensagem("m1"), mensagem("m2"), mensagem("m3"), mensagem("m4")]]);
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(sucesso("wamid.1"))
      .mockResolvedValueOnce(erroMeta(400, 131026)) // número sem WhatsApp: falha definitiva
      .mockResolvedValueOnce(erroMeta(429, 130429)) // limite: tentar depois
      .mockRejectedValueOnce(new Error("timeout")); // sem resposta: tentar depois

    const resumo = await processarFila({ fila, fetch, credenciais: CREDENCIAIS });

    expect(resumo).toEqual({ enviadas: 1, falhas: 1, adiadas: 2 });
    expect(fila.reservar).toHaveBeenCalledWith(LOTE);
    expect(fila.resultado.mock.calls).toEqual([
      ["m1", "enviada", { wamid: "wamid.1" }],
      ["m2", "falhou", { erro: "131026: x" }],
      ["m3", "na_fila", { erro: "130429: x" }],
      ["m4", "na_fila", { erro: "sem resposta da Meta" }],
    ]);
    expect(fetch).toHaveBeenCalledWith("https://graph.facebook.com/v23.0/123/messages", expect.objectContaining({ method: "POST" }));
  });

  it("sem credenciais não reserva nem envia", async () => {
    const fila = filaFalsa([[mensagem("m1")]]);
    const fetch = vi.fn();
    expect(await processarFila({ fila, fetch, credenciais: {} })).toEqual({ enviadas: 0, falhas: 0, adiadas: 0 });
    expect(fila.reservar).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falha ao gravar o resultado não para o lote", async () => {
    const fila = filaFalsa([[mensagem("m1"), mensagem("m2")]]);
    fila.resultado.mockRejectedValueOnce(new Error("whatsapp_resultado falhou (XX000)"));
    const fetch = vi.fn().mockResolvedValue(sucesso("w"));
    expect(await processarFila({ fila, fetch, credenciais: CREDENCIAIS })).toEqual({ enviadas: 2, falhas: 0, adiadas: 0 });
    expect(fila.resultado).toHaveBeenCalledTimes(2);
  });
});

describe("processarTudo", () => {
  const cheio = (prefixo: string) => Array.from({ length: LOTE }, (_, i) => mensagem(`${prefixo}${i}`));

  it("para quando um lote vem incompleto (a fila acabou)", async () => {
    const fila = filaFalsa([cheio("a"), [mensagem("b0")], cheio("c")]);
    const total = await processarTudo(5, { fila, fetch: vi.fn().mockResolvedValue(sucesso("w")), credenciais: CREDENCIAIS });
    expect(total.enviadas).toBe(LOTE + 1);
    expect(fila.reservar).toHaveBeenCalledTimes(2);
  });

  it("para quando a Meta pede para esperar", async () => {
    const fila = filaFalsa([cheio("a"), cheio("b")]);
    const fetch = vi.fn().mockResolvedValueOnce(erroMeta(429, 130429)).mockResolvedValue(sucesso("w"));
    const total = await processarTudo(5, { fila, fetch, credenciais: CREDENCIAIS });
    expect(total).toEqual({ enviadas: LOTE - 1, falhas: 0, adiadas: 1 });
    expect(fila.reservar).toHaveBeenCalledTimes(1);
  });

  it("respeita o número de lotes", async () => {
    const fila = filaFalsa([cheio("a"), cheio("b"), cheio("c")]);
    await processarTudo(2, { fila, fetch: vi.fn().mockResolvedValue(sucesso("w")), credenciais: CREDENCIAIS });
    expect(fila.reservar).toHaveBeenCalledTimes(2);
  });
});

describe("aplicarEventos (webhook)", () => {
  const eventos = {
    statuses: [{ wamid: "wamid.1", status: "entregue" as const, erro: null }],
    saidas: [["+5511987654321", "+551187654321"]],
  };

  it("aplica os status e os pedidos de SAIR", async () => {
    const fila = filaFalsa([]);
    await aplicarEventos(eventos, fila);
    expect(fila.statusDaMeta).toHaveBeenCalledWith("wamid.1", "entregue", null);
    expect(fila.optout).toHaveBeenCalledWith(["+5511987654321", "+551187654321"]);
  });

  it("lança erro se a fila falhar (a rota responde 500 e a Meta tenta de novo)", async () => {
    const fila = filaFalsa([]);
    fila.optout.mockRejectedValueOnce(new Error("whatsapp_optout falhou (XX000)"));
    await expect(aplicarEventos(eventos, fila)).rejects.toThrow("whatsapp_optout falhou");
  });
});
