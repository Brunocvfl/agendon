import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { assinaturaValida, bearerValido, textosIguais } from "./assinatura";
import { candidatosDeTelefone, ehPedidoDeSaida, lerEventos } from "./eventos";
import { lerRespostaDaMeta } from "./graph";
import { montarMensagem, parametro, quando, TEXTOS } from "./template";

const assinar = (corpo: string, segredo: string) => `sha256=${createHmac("sha256", segredo).update(corpo).digest("hex")}`;

describe("assinatura do webhook", () => {
  const corpo = '{"entry":[{"changes":[]}]}';
  it("aceita a assinatura correta (texto ou bytes)", () => {
    expect(assinaturaValida(corpo, assinar(corpo, "segredo"), "segredo")).toBe(true);
    expect(assinaturaValida(Buffer.from(corpo), assinar(corpo, "segredo"), "segredo")).toBe(true);
  });
  it("recusa segredo errado, corpo alterado e cabeçalho ausente ou malformado", () => {
    expect(assinaturaValida(corpo, assinar(corpo, "outro"), "segredo")).toBe(false);
    expect(assinaturaValida(corpo + " ", assinar(corpo, "segredo"), "segredo")).toBe(false);
    expect(assinaturaValida(corpo, null, "segredo")).toBe(false);
    expect(assinaturaValida(corpo, "sha256=abc", "segredo")).toBe(false);
    expect(assinaturaValida(corpo, assinar(corpo, "segredo").replace("sha256=", "sha1="), "segredo")).toBe(false);
    expect(assinaturaValida(corpo, assinar(corpo, ""), "")).toBe(false);
  });
  it("compara textos sem depender do tamanho", () => {
    expect(textosIguais("abc", "abc")).toBe(true);
    expect(textosIguais("abc", "abd")).toBe(false);
    expect(textosIguais("abc", "abcd")).toBe(false);
  });
});

describe("pedido de saída", () => {
  it.each(["SAIR", " sair ", "Sair!", "sáir", "PARAR", "stop"])("%s sai", (t) => expect(ehPedidoDeSaida(t)).toBe(true));
  it.each(["não quero sair hoje", "oi", "", "sair de casa"])("%s não sai", (t) => expect(ehPedidoDeSaida(t)).toBe(false));
});

describe("candidatos de telefone", () => {
  it("celular brasileiro com 9 devolve também a forma sem o 9", () => {
    expect(candidatosDeTelefone("5511987654321")).toEqual(["+5511987654321", "+551187654321"]);
  });
  it("celular brasileiro sem o 9 devolve também a forma com o 9", () => {
    expect(candidatosDeTelefone("551187654321")).toEqual(["+551187654321", "+5511987654321"]);
  });
  it("fixo brasileiro e número de outro país ficam como estão", () => {
    expect(candidatosDeTelefone("551132654321")).toEqual(["+551132654321"]);
    expect(candidatosDeTelefone("15551437737")).toEqual(["+15551437737"]);
  });
  it("lixo não vira telefone", () => {
    expect(candidatosDeTelefone("abc")).toEqual([]);
    expect(candidatosDeTelefone("123")).toEqual([]);
  });
});

describe("eventos do webhook", () => {
  const envelope = (value: unknown) => ({ object: "whatsapp_business_account", entry: [{ id: "1", changes: [{ field: "messages", value }] }] });

  it("lê os status e guarda só o erro curto, sem número longo", () => {
    const e = lerEventos(
      envelope({
        statuses: [
          { id: "wamid.A", status: "sent", recipient_id: "5511987654321" },
          { id: "wamid.B", status: "delivered" },
          { id: "wamid.C", status: "read" },
          { id: "wamid.D", status: "failed", errors: [{ code: 131026, title: "Message undeliverable for 5511987654321" }] },
          { id: "wamid.E", status: "deleted" },
          { status: "sent" },
        ],
      }),
    );
    expect(e.statuses).toEqual([
      { wamid: "wamid.A", status: "enviada", erro: null },
      { wamid: "wamid.B", status: "entregue", erro: null },
      { wamid: "wamid.C", status: "lida", erro: null },
      { wamid: "wamid.D", status: "falhou", erro: "131026: Message undeliverable for …" },
    ]);
    expect(e.saidas).toEqual([]);
  });

  it("lê SAIR em texto e em botão; ignora outras mensagens", () => {
    const e = lerEventos(
      envelope({
        messages: [
          { from: "5511987654321", type: "text", text: { body: "Sair" } },
          { from: "5521999990000", type: "button", button: { text: "PARAR" } },
          { from: "5511911112222", type: "text", text: { body: "Oi, tudo bem?" } },
          { from: "5511933334444", type: "image" },
        ],
      }),
    );
    expect(e.saidas).toEqual([
      ["+5511987654321", "+551187654321"],
      ["+5521999990000", "+552199990000"],
    ]);
  });

  it("aguenta corpo estranho", () => {
    for (const corpo of [null, "x", 1, [], {}, { entry: "x" }, { entry: [null, { changes: [1, { value: 2 }] }] }]) {
      expect(lerEventos(corpo)).toEqual({ statuses: [], saidas: [] });
    }
  });
});

describe("template da confirmação", () => {
  it("parametro limpa quebras de linha, espaços e vazio", () => {
    expect(parametro("  Ana \n  Paula\t")).toBe("Ana Paula");
    expect(parametro("   ")).toBe("-");
    expect(parametro("x".repeat(100))).toHaveLength(60);
  });

  it("quando mostra dia e hora no fuso do salão", () => {
    // 2026-11-12 18:30Z = 15:30 em São Paulo (quinta-feira).
    expect(quando("2026-11-12T18:30:00Z", "America/Sao_Paulo")).toBe("qui, 12 nov às 15:30");
  });

  it("monta o corpo da Cloud API com cinco variáveis, na ordem do template", () => {
    const corpo = montarMensagem("confirmacao_agendamento_v2", "+5511987654321", {
      nome: "Marina",
      salao: "Studio Teste",
      servico: "Corte",
      profissional: "Ana",
      inicio: "2026-11-12T18:30:00Z",
      fuso: "America/Sao_Paulo",
    });
    expect(corpo).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "5511987654321",
      type: "template",
      template: {
        name: "confirmacao_agendamento_v2",
        language: { code: "pt_BR" },
        components: [
          {
            type: "body",
            parameters: ["Marina", "Studio Teste", "Corte", "Ana", "qui, 12 nov às 15:30"].map((text) => ({ type: "text", text })),
          },
        ],
      },
    });
  });
});

describe("resposta da Meta ao enviar", () => {
  it("sucesso devolve o id da mensagem", () => {
    expect(lerRespostaDaMeta(200, { messages: [{ id: "wamid.X" }] })).toEqual({ ok: true, wamid: "wamid.X" });
  });
  it("200 sem id da mensagem é falha definitiva", () => {
    expect(lerRespostaDaMeta(200, {})).toMatchObject({ ok: false, tentarDepois: false });
  });
  it("destinatário fora da lista de teste é falha definitiva", () => {
    const r = lerRespostaDaMeta(400, { error: { code: 131030, message: "Recipient phone number not in allowed list" } });
    expect(r).toEqual({ ok: false, tentarDepois: false, erro: "131030: Recipient phone number not in allowed list" });
  });
  it("limite de chamadas e erro do servidor valem nova tentativa", () => {
    expect(lerRespostaDaMeta(429, {})).toMatchObject({ tentarDepois: true });
    expect(lerRespostaDaMeta(503, null)).toMatchObject({ tentarDepois: true });
    expect(lerRespostaDaMeta(400, { error: { code: 130429, message: "Rate limit hit" } })).toMatchObject({ tentarDepois: true });
  });
  it("token inválido é definitivo e o erro não leva número de telefone", () => {
    const r = lerRespostaDaMeta(401, { error: { code: 190, message: "Invalid token for 5511987654321" } });
    expect(r).toEqual({ ok: false, tentarDepois: false, erro: "190: Invalid token for …" });
  });
});

describe("segredo da rota de envio", () => {
  const segredo = "s".repeat(40);
  it("aceita o Bearer certo", () => {
    expect(bearerValido(`Bearer ${segredo}`, segredo)).toBe(true);
  });
  it("recusa ausente, errado, sem Bearer ou segredo curto/não configurado", () => {
    expect(bearerValido(null, segredo)).toBe(false);
    expect(bearerValido(`Bearer ${segredo}x`, segredo)).toBe(false);
    expect(bearerValido(segredo, segredo)).toBe(false);
    expect(bearerValido("Bearer curto", "curto")).toBe(false);
    expect(bearerValido("Bearer ", undefined)).toBe(false);
  });
});

describe("template do lembrete", () => {
  const dados = {
    nome: "Marina",
    salao: "Studio Teste",
    servico: "Corte",
    profissional: "Ana",
    inicio: "2026-11-12T18:30:00Z",
    fuso: "America/Sao_Paulo",
  };
  it("usa as mesmas cinco variáveis da confirmação", () => {
    const corpo = montarMensagem("lembrete_agendamento", "+5511987654321", dados);
    expect(corpo.template.name).toBe("lembrete_agendamento");
    expect(corpo.template.components[0].parameters.map((p) => p.text)).toEqual([
      "Marina", "Studio Teste", "Corte", "Ana", "qui, 12 nov às 15:30",
    ]);
  });
  it("a prévia mostra o texto aprovado com os dados", () => {
    expect(TEXTOS.lembrete(dados)).toBe(
      "Olá, Marina! Passando para lembrar do seu horário no Studio Teste: Corte com Ana, qui, 12 nov às 15:30. Se precisar mudar ou cancelar, fale com o salão. Até lá!",
    );
  });
});
