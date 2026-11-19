import { describe, expect, it, vi } from "vitest";

// Sem banco nem rede: a fila é falsa e o envio devolve o status que o teste escolhe.
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/secreto", () => ({
  clienteSecreto: () => {
    throw new Error("o teste não pode usar a chave secreta");
  },
}));

const { processarPush } = await import("./enviar");
const { avisoDeAgendamento, corpoDoAviso } = await import("./aviso");
type FilaPush = import("./fila").FilaPush;
type AvisoReservado = import("./fila").AvisoReservado;

const VAPID = { publica: "pub", privada: "priv", assunto: "mailto:teste@agendon.app.br" };

const linha = (notificacao: string, inscricao: string): AvisoReservado => ({
  notificacao_id: notificacao,
  inscricao_id: inscricao,
  endpoint: `https://push.teste/${inscricao}`,
  p256dh: "chave",
  auth: "segredo",
  appointment_id: "ag-1",
  cliente: "Marina",
  servico: "Corte feminino",
});

function filaFalsa(linhas: AvisoReservado[]) {
  const fila = {
    reservar: vi.fn(async () => linhas),
    resultado: vi.fn(async () => {}),
    removerInscricao: vi.fn(async () => {}),
  } satisfies FilaPush;
  return fila;
}

describe("aviso", () => {
  it("mostra só o nome e o serviço", () => {
    expect(corpoDoAviso(" Marina ", "Corte feminino ")).toBe("Marina · Corte feminino");
    expect(avisoDeAgendamento({ appointmentId: "ag-1", cliente: "Marina", servico: "Corte" })).toEqual({
      titulo: "Novo agendamento",
      corpo: "Marina · Corte",
      url: "/painel/agenda/ag-1",
      tag: "agendamento-ag-1",
    });
  });
});

describe("processarPush", () => {
  it("sem chaves VAPID não reserva nada", async () => {
    const fila = filaFalsa([linha("n1", "i1")]);
    const r = await processarPush({ fila, vapid: {}, enviar: vi.fn() });
    expect(r).toEqual({ enviadas: 0, falhas: 0 });
    expect(fila.reservar).not.toHaveBeenCalled();
  });

  it("envia o aviso com nome e serviço e grava enviada", async () => {
    const fila = filaFalsa([linha("n1", "i1")]);
    const enviar = vi.fn(async () => 201);
    const r = await processarPush({ fila, vapid: VAPID, enviar });
    expect(r).toEqual({ enviadas: 1, falhas: 0 });
    const [inscricao, conteudo] = enviar.mock.calls[0] as unknown as [{ endpoint: string }, string];
    expect(inscricao.endpoint).toBe("https://push.teste/i1");
    expect(JSON.parse(conteudo)).toMatchObject({ titulo: "Novo agendamento", corpo: "Marina · Corte feminino" });
    expect(fila.resultado).toHaveBeenCalledWith("n1", "enviada");
  });

  it("um aviso em dois aparelhos: basta chegar a um", async () => {
    const fila = filaFalsa([linha("n1", "i1"), linha("n1", "i2")]);
    const enviar = vi.fn().mockResolvedValueOnce(500).mockResolvedValueOnce(201);
    const r = await processarPush({ fila, vapid: VAPID, enviar });
    expect(r).toEqual({ enviadas: 1, falhas: 0 });
    expect(fila.resultado).toHaveBeenCalledTimes(1);
    expect(fila.resultado).toHaveBeenCalledWith("n1", "enviada");
  });

  it("aparelho que sumiu (410) sai da lista; aviso sem entrega vira falha", async () => {
    const fila = filaFalsa([linha("n1", "i1")]);
    const r = await processarPush({ fila, vapid: VAPID, enviar: vi.fn(async () => 410) });
    expect(r).toEqual({ enviadas: 0, falhas: 1 });
    expect(fila.removerInscricao).toHaveBeenCalledWith("i1");
    expect(fila.resultado).toHaveBeenCalledWith("n1", "falhou");
  });

  it("erro de rede não derruba o lote", async () => {
    const fila = filaFalsa([linha("n1", "i1"), linha("n2", "i2")]);
    const enviar = vi.fn().mockRejectedValueOnce(new Error("rede")).mockResolvedValueOnce(201);
    const r = await processarPush({ fila, vapid: VAPID, enviar });
    expect(r).toEqual({ enviadas: 1, falhas: 1 });
    expect(fila.removerInscricao).not.toHaveBeenCalled();
  });
});
