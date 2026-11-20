import { describe, expect, it } from "vitest";
import { avisoDoPlano, diasRestantes, ehLimiteDeAgendas, type UsoDoPlano } from "./plano";

const agora = new Date("2026-11-20T12:00:00Z");
const uso = (u: Partial<UsoDoPlano>): UsoDoPlano => ({
  plano: "teste",
  teste_ate: "2026-12-20T12:00:00Z",
  teste_encerrado: false,
  max_agendas: 15,
  agendas: 2,
  max_mensagens: 10,
  mensagens: 3,
  ...u,
});

describe("diasRestantes", () => {
  it("arredonda para cima e não fica negativo", () => {
    expect(diasRestantes("2026-12-20T12:00:00Z", agora)).toBe(30);
    expect(diasRestantes("2026-11-20T13:00:00Z", agora)).toBe(1);
    expect(diasRestantes("2026-11-19T12:00:00Z", agora)).toBe(0);
  });
});

describe("avisoDoPlano", () => {
  it("teste em dia: dias, agendas e mensagens", () => {
    expect(avisoDoPlano(uso({}), agora)).toEqual({
      tom: "info",
      titulo: "Teste grátis: faltam 30 dias",
      texto: "2 agendas ativas de 15. Mensagens de confirmação: 3 de 10.",
    });
  });

  it("teste no fim ou sem mensagens vira alerta", () => {
    expect(avisoDoPlano(uso({ teste_ate: "2026-11-21T00:00:00Z" }), agora)).toMatchObject({
      tom: "alerta",
      titulo: "Teste grátis: falta 1 dia",
    });
    expect(avisoDoPlano(uso({ mensagens: 10 }), agora)?.tom).toBe("alerta");
  });

  it("teste encerrado", () => {
    expect(avisoDoPlano(uso({ teste_encerrado: true }), agora)?.titulo).toBe("Seu teste grátis terminou");
  });

  it("plano pago: só avisa a partir de 80% da franquia", () => {
    const pago = { plano: "essencial" as const, teste_ate: null, max_mensagens: 300 };
    expect(avisoDoPlano(uso({ ...pago, mensagens: 239 }), agora)).toBeNull();
    expect(avisoDoPlano(uso({ ...pago, mensagens: 240 }), agora)?.titulo).toBe("As mensagens do mês estão acabando");
    expect(avisoDoPlano(uso({ ...pago, mensagens: 300 }), agora)?.titulo).toBe("As mensagens do mês acabaram");
  });

  it("cortesia não tem aviso", () => {
    expect(avisoDoPlano(uso({ plano: "cortesia", teste_ate: null, max_mensagens: null }), agora)).toBeNull();
  });
});

describe("ehLimiteDeAgendas", () => {
  it("reconhece o erro do banco", () => {
    expect(ehLimiteDeAgendas({ message: "limite_de_agendas" })).toBe(true);
    expect(ehLimiteDeAgendas({ message: "outra coisa" })).toBe(false);
  });
});
