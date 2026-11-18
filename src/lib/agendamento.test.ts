import { describe, expect, it, vi } from "vitest";

// O teste cruza só a interface do Agendamento: o banco é um cliente falso e a fila, um espião.
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("@/lib/whatsapp/enviar", () => ({ processarFila: async () => ({}) }));

const ag = await import("./agendamento");

const ID = "11111111-1111-4111-8111-111111111111";
const ID2 = "22222222-2222-4222-8222-222222222222";

function banco(resposta: { data?: unknown; error?: { code?: string; message?: string } | null }) {
  const rpc = vi.fn().mockResolvedValue({ data: resposta.data ?? null, error: resposta.error ?? null });
  const avisarFila = vi.fn();
  return { deps: { supabase: { rpc } as never, avisarFila }, rpc, avisarFila };
}

const NOVO = {
  profissional: ID,
  servico: ID2,
  dia: "2030-03-05",
  inicio: "2030-03-05T10:00",
  cliente: { nome: "Ana", telefone: "+5511987654321" },
  encaixe: false,
};
const PUBLICO = {
  servico: ID2,
  profissional: null,
  inicio: "2030-03-05T10:00",
  nome: "Ana",
  telefone: "+5511987654321",
  optin: true,
  atendido: null,
};
const REMARCACAO = { id: ID, profissional: ID2, dia: "2030-03-05", inicio: "2030-03-05T11:00", encaixe: true };

const erro = (code: string, message = "x") => ({ code, message });

describe("tradução dos erros do banco", () => {
  it.each([
    ["23P01", "conflicting key value", "ocupado"],
    ["22023", "fora_do_expediente", "fora-do-expediente"],
    ["22023", "servico_nao_atendido", "servico-nao-atendido"],
    ["23514", 'new row for relation "clients" violates check constraint "clients_nome_check"', "cliente-invalido"],
    ["22023", "cliente_nao_encontrado", "cliente-nao-encontrado"],
    ["22023", "cliente_obrigatorio", "dado-invalido"],
    ["42501", "sem_permissao", "sem-permissao"],
    ["P0002", "profissional_nao_encontrado", "nao-encontrado"],
    ["XX000", "boom", "outro"],
  ])("criar: %s %s -> %s", async (code, message, tipo) => {
    const { deps } = banco({ error: erro(code, message) });
    expect(await ag.criar(NOVO, deps)).toEqual({ ok: false, erro: tipo });
  });

  it.each([
    ["22023", "transicao_invalida", "transicao-invalida"],
    ["22023", "fora_do_expediente", "fora-do-expediente"],
    ["P0002", "agendamento_nao_encontrado", "nao-encontrado"],
    // Erro que não pertence à operação vira "outro".
    ["P0001", "muitas_tentativas", "outro"],
  ])("remarcar: %s %s -> %s", async (code, message, tipo) => {
    const { deps } = banco({ error: erro(code, message) });
    expect(await ag.remarcar(REMARCACAO, deps)).toEqual({ ok: false, erro: tipo });
  });

  it.each([
    ["22023", "ainda_nao_comecou", "ainda-nao-comecou"],
    ["22023", "transicao_invalida", "transicao-invalida"],
    ["23P01", "conflito", "ocupado"],
  ])("mudarStatus: %s %s -> %s", async (code, message, tipo) => {
    const { deps } = banco({ error: erro(code, message) });
    expect(await ag.mudarStatus({ id: ID, status: "cancelado" }, deps)).toEqual({ ok: false, erro: tipo });
  });

  it.each([
    ["23P01", "horario_indisponivel", "ocupado"],
    ["P0001", "muitas_tentativas", "muitas-tentativas"],
    ["P0001", "muitos_agendamentos", "muitos-agendamentos"],
    ["22023", "telefone_invalido", "telefone-invalido"],
    ["22023", "servico_nao_atendido", "servico-nao-atendido"],
    ["P0002", "salao_nao_encontrado", "salao-indisponivel"],
    ["22023", "nome_invalido", "dado-invalido"],
    ["42501", "permission denied", "outro"],
  ])("agendarPublico: %s %s -> %s", async (code, message, tipo) => {
    const { deps } = banco({ error: erro(code, message) });
    expect(await ag.agendarPublico("salao", PUBLICO, "hash", deps)).toEqual({ ok: false, erro: tipo });
  });
});

describe("fila do WhatsApp", () => {
  it("criar avisa a fila só quando dá certo", async () => {
    const certo = banco({ data: ID });
    expect(await ag.criar(NOVO, certo.deps)).toEqual({ ok: true, data: ID });
    expect(certo.avisarFila).toHaveBeenCalledOnce();

    const falhou = banco({ error: erro("23P01") });
    await ag.criar(NOVO, falhou.deps);
    expect(falhou.avisarFila).not.toHaveBeenCalled();
  });

  it("agendarPublico avisa a fila e devolve a confirmação", async () => {
    const linha = { id: ID, inicio: "2030-03-05T13:00:00Z", fim: "2030-03-05T14:00:00Z", profissional: "Bia", servico: "Corte", preco: 90 };
    const { deps, avisarFila } = banco({ data: [linha] });
    expect(await ag.agendarPublico("salao", PUBLICO, "hash", deps)).toEqual({
      ok: true,
      data: { servico: "Corte", profissional: "Bia", inicio: linha.inicio, fim: linha.fim, preco: 90 },
    });
    expect(avisarFila).toHaveBeenCalledOnce();

    const ocupado = banco({ error: erro("23P01") });
    await ag.agendarPublico("salao", PUBLICO, "hash", ocupado.deps);
    expect(ocupado.avisarFila).not.toHaveBeenCalled();
  });

  it("remarcar e mudarStatus não avisam a fila (ainda não há mensagem para eles)", async () => {
    const r = banco({});
    await ag.remarcar(REMARCACAO, r.deps);
    await ag.mudarStatus({ id: ID, status: "confirmado" }, r.deps);
    expect(r.avisarFila).not.toHaveBeenCalled();
  });
});

describe("parâmetros das funções do banco", () => {
  it("criar com cliente existente manda só o id; com cliente novo, nome e WhatsApp", async () => {
    const a = banco({ data: ID });
    await ag.criar({ ...NOVO, cliente: { id: ID } }, a.deps);
    expect(a.rpc).toHaveBeenCalledWith("criar_agendamento", {
      p_professional: ID, p_service: ID2, p_inicio: "2030-03-05T10:00", p_encaixe: false, p_client: ID,
    });
    const b = banco({ data: ID });
    await ag.criar(NOVO, b.deps);
    expect(b.rpc).toHaveBeenCalledWith("criar_agendamento", expect.objectContaining({
      p_cliente_nome: "Ana", p_cliente_telefone: "+5511987654321",
    }));
  });

  it("agendarPublico manda null para 'qualquer profissional' e a origem", async () => {
    const { deps, rpc } = banco({ data: [{ servico: "", profissional: "", inicio: "", fim: "", preco: 0 }] });
    await ag.agendarPublico("salao", PUBLICO, "hash", deps);
    expect(rpc).toHaveBeenCalledWith("agendar_publico", expect.objectContaining({
      p_slug: "salao", p_professional: null, p_optin: true, p_origem: "hash",
    }));
    expect(rpc.mock.calls[0][1]).not.toHaveProperty("p_atendido");
  });

  it("agendarPublico manda o nome da outra pessoa", async () => {
    const { deps, rpc } = banco({ data: [{ servico: "", profissional: "", inicio: "", fim: "", preco: 0 }] });
    await ag.agendarPublico("salao", { ...PUBLICO, atendido: "Júlia" }, "hash", deps);
    expect(rpc).toHaveBeenCalledWith("agendar_publico", expect.objectContaining({ p_atendido: "Júlia" }));
  });

  it("horariosLivres só manda p_ignorar quando é um id válido", async () => {
    const a = banco({ data: ["2030-03-05T12:00:00Z"] });
    const q = { profissional: ID, servico: ID2, dia: "2030-03-05" };
    expect(await ag.horariosLivres({ ...q, ignorar: ID }, a.deps)).toEqual({ ok: true, data: ["2030-03-05T12:00:00Z"] });
    expect(a.rpc).toHaveBeenCalledWith("horarios_livres", { p_professional: ID, p_service: ID2, p_dia: "2030-03-05", p_ignorar: ID });
    const b = banco({ data: [] });
    await ag.horariosLivres({ ...q, ignorar: "lixo" }, b.deps);
    expect(b.rpc).toHaveBeenCalledWith("horarios_livres", { p_professional: ID, p_service: ID2, p_dia: "2030-03-05" });
  });

  it("horários com entrada inválida não chamam o banco", async () => {
    const { deps, rpc } = banco({});
    expect(await ag.horariosLivres({ profissional: "x", servico: ID2, dia: "2030-03-05" }, deps)).toEqual({ ok: true, data: [] });
    expect(await ag.horariosPublicos({ slug: "s", servico: ID2, profissional: null, dia: "2030-02-30" }, deps)).toEqual({ ok: true, data: [] });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("falha do banco nos horários é erro, não lista vazia", async () => {
    const { deps } = banco({ error: erro("XX000") });
    expect(await ag.horariosPublicos({ slug: "s", servico: ID2, profissional: null, dia: "2030-03-05" }, deps)).toEqual({ ok: false, erro: "outro" });
  });
});
