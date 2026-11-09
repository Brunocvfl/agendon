import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { lerServico } from "./servico";
import { lerNomeProfissional } from "./profissional";
import { lerFolga } from "./folga";
import { lerCliente, lerTelefone } from "./cliente";
import { lerAgendamento, lerAgendamentoPublico, lerMudancaDeStatus, lerRemarcacao, proximosStatus } from "./agendamento";
import { formatarEndereco, lerDadosSalao, lerInstagram, lerSalao, normalizarSlug, SLUGS_RESERVADOS } from "./salao";
import { lerConvite, lerMembro } from "./equipe";

describe("lerServico", () => {
  it("aceita e normaliza", () => {
    expect(lerServico({ nome: "  Corte   feminino ", duracao: "60", preco: "89,90" })).toEqual({
      ok: true,
      valor: { nome: "Corte feminino", duracao_min: 60, preco: 89.9 },
    });
  });
  it("lê preço com milhar", () => {
    const r = lerServico({ nome: "Mega hair", duracao: "240", preco: "1.095,00" });
    expect(r.ok && r.valor.preco).toBe(1095);
  });
  it("aponta cada campo inválido", () => {
    const r = lerServico({ nome: "X", duracao: "3", preco: "noventa" });
    expect(r.ok).toBe(false);
    expect(Object.keys(!r.ok ? r.erros : {}).sort()).toEqual(["duracao", "nome", "preco"]);
  });
  it("recusa duração quebrada e acima do limite", () => {
    expect(lerServico({ nome: "Corte", duracao: "30.5", preco: "10" }).ok).toBe(false);
    expect(lerServico({ nome: "Corte", duracao: "721", preco: "10" }).ok).toBe(false);
  });
});

describe("lerNomeProfissional", () => {
  it("limpa espaços", () => expect(lerNomeProfissional("  Ana   Lima ")).toEqual({ ok: true, valor: "Ana Lima" }));
  it("recusa nome curto", () => expect(lerNomeProfissional(" A ").ok).toBe(false));
});

describe("lerFolga", () => {
  it("dia inteiro: um dia vai de 00:00 até 00:00 do dia seguinte", () =>
    expect(lerFolga({ modo: "dia", dataInicio: "2026-12-01", dataFim: "2026-12-01", motivo: " Folga " })).toEqual({
      ok: true,
      valor: { inicio: "2026-12-01T00:00", fim: "2026-12-02T00:00", motivo: "Folga" },
    }));
  it("dia inteiro: vira o mês e o ano", () => {
    const r = lerFolga({ modo: "dia", dataInicio: "2026-12-20", dataFim: "2026-12-31" });
    expect(r.ok && r.valor).toEqual({ inicio: "2026-12-20T00:00", fim: "2027-01-01T00:00", motivo: "" });
  });
  it("dia inteiro: recusa último dia antes do primeiro", () =>
    expect(lerFolga({ modo: "dia", dataInicio: "2026-12-15", dataFim: "2026-12-01" })).toEqual({
      ok: false,
      erros: { periodo: "O último dia precisa ser igual ou depois do primeiro." },
    }));
  it("dia inteiro: recusa data inexistente", () =>
    expect(lerFolga({ modo: "dia", dataInicio: "2026-02-30", dataFim: "2026-03-01" }).ok).toBe(false));
  it("horário: aceita período e corta o motivo em 80", () => {
    const r = lerFolga({ modo: "horario", data: "2026-11-19", horaInicio: "14:00", horaFim: "16:00", motivo: "x".repeat(100) });
    expect(r.ok && r.valor).toEqual({ inicio: "2026-11-19T14:00", fim: "2026-11-19T16:00", motivo: "x".repeat(80) });
  });
  it("horário: recusa fim igual ou antes do começo", () =>
    expect(lerFolga({ modo: "horario", data: "2026-11-19", horaInicio: "16:00", horaFim: "16:00" })).toEqual({
      ok: false,
      erros: { periodo: "O fim precisa ser depois do começo." },
    }));
  it("recusa campos faltando", () => {
    expect(lerFolga({ modo: "horario", data: "2026-11-19", horaInicio: "14:00" }).ok).toBe(false);
    expect(lerFolga({ modo: "dia", dataInicio: "2026-12-01" }).ok).toBe(false);
  });
  it("recusa modo desconhecido", () => expect(lerFolga({ dataInicio: "2026-12-01", dataFim: "2026-12-01" }).ok).toBe(false));
});

describe("lerSalao", () => {
  it("normaliza o endereço", () => {
    expect(normalizarSlug("  Studio Bela Vida Ação! ")).toBe("studio-bela-vida-acao");
    expect(lerSalao({ nome: "Studio", slug: "Studio-Bela" })).toEqual({ ok: true, valor: { nome: "Studio", slug: "studio-bela" } });
  });
  it("recusa endereço reservado e curto", () => {
    expect(lerSalao({ nome: "Painel", slug: "painel" }).ok).toBe(false);
    expect(lerSalao({ nome: "Studio", slug: "ab" }).ok).toBe(false);
  });
  it("lista de reservados é igual à do banco (migration de onboarding)", () => {
    // A definição que vale é a da migration mais recente que recria app.slug_reservado.
    const pasta = fileURLToPath(new URL("../../../supabase/migrations/", import.meta.url));
    const sql = readdirSync(pasta)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .map((f) => readFileSync(`${pasta}${f}`, "utf8"))
      .filter((conteudo) => conteudo.includes("function app.slug_reservado"))
      .at(-1)!;
    const bloco = sql.match(/select p_slug = any \(array\[([\s\S]*?)\]\)/)?.[1] ?? "";
    const doBanco = [...bloco.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
    expect([...SLUGS_RESERVADOS].sort()).toEqual(doBanco);
  });
});

describe("lerTelefone", () => {
  it.each([
    ["(11) 98765-4321", "+5511987654321"],
    ["11987654321", "+5511987654321"],
    ["011 98765 4321", "+5511987654321"],
    ["55 11 98765-4321", "+5511987654321"],
    ["+55 (21) 3456-7890", "+552134567890"],
    ["+1 415 555 2671", "+14155552671"],
  ])("%s -> %s", (entrada, esperado) => expect(lerTelefone(entrada)).toBe(esperado));

  it.each([
    "",
    "98765-4321", // sem DDD
    "(11) 8765-43210", // celular sem o 9
    "(01) 98765-4321", // DDD inválido
    "(11) 98765-432", // faltando dígito
    "+55 11 98765-43210", // dígito a mais
  ])("recusa %s", (entrada) => expect(lerTelefone(entrada)).toBeNull());
});

describe("lerCliente", () => {
  it("aceita e normaliza", () =>
    expect(lerCliente({ nome: "  Marina   Prado ", telefone: "(11) 98765-4321", observacoes: "  Prefere manhã\n " })).toEqual({
      ok: true,
      valor: { nome: "Marina Prado", telefone: "+5511987654321", observacoes: "Prefere manhã" },
    }));
  it("observações vazias viram null", () => {
    const r = lerCliente({ nome: "Ana", telefone: "11987654321", observacoes: "   " });
    expect(r.ok && r.valor.observacoes).toBeNull();
  });
  it("aponta cada campo inválido", () => {
    const r = lerCliente({ nome: "A", telefone: "123", observacoes: "x".repeat(501) });
    expect(r.ok ? [] : Object.keys(r.erros).sort()).toEqual(["nome", "observacoes", "telefone"]);
  });
});

describe("lerAgendamento", () => {
  const base = {
    profissional: "00000000-0000-4000-e000-000000000001",
    servico: "00000000-0000-4000-d000-000000000001",
    dia: "2026-11-10",
    hora: "09:30",
  };
  it("cliente existente", () =>
    expect(lerAgendamento({ ...base, modoCliente: "existente", clienteId: "00000000-0000-4000-f000-000000000001" })).toEqual({
      ok: true,
      valor: { profissional: base.profissional, servico: base.servico, dia: base.dia, inicio: "2026-11-10T09:30", cliente: { id: "00000000-0000-4000-f000-000000000001" }, encaixe: false },
    }));
  it("cliente novo normaliza o WhatsApp", () => {
    const r = lerAgendamento({ ...base, modoCliente: "novo", nome: " Ana  Paula ", telefone: "(11) 98765-4321", encaixe: true });
    expect(r.ok && r.valor.cliente).toEqual({ nome: "Ana Paula", telefone: "+5511987654321" });
    expect(r.ok && r.valor.encaixe).toBe(true);
  });
  it("aponta o que falta", () => {
    const r = lerAgendamento({ dia: "2026-02-30", hora: "25:00", modoCliente: "existente" });
    expect(r.ok ? [] : Object.keys(r.erros).sort()).toEqual(["cliente", "dia", "hora", "profissional", "servico"]);
  });
  it("cliente novo com WhatsApp inválido", () => {
    const r = lerAgendamento({ ...base, modoCliente: "novo", nome: "Ana", telefone: "123" });
    expect(r.ok ? [] : Object.keys(r.erros)).toEqual(["telefone"]);
  });
});

describe("lerRemarcacao", () => {
  const id = "00000000-0000-4000-a000-000000000001";
  const profissional = "00000000-0000-4000-e000-000000000001";
  it("monta o início no horário do salão", () =>
    expect(lerRemarcacao({ id, profissional, dia: "2026-11-10", hora: "14:15" })).toEqual({
      ok: true,
      valor: { id, profissional, dia: "2026-11-10", inicio: "2026-11-10T14:15", encaixe: false },
    }));
  it("aponta dia e hora inválidos", () => {
    const r = lerRemarcacao({ id, profissional, dia: "10/11/2026", hora: "25:00" });
    expect(r.ok ? [] : Object.keys(r.erros).sort()).toEqual(["dia", "hora"]);
  });
  it("id inválido vira erro geral", () => {
    const r = lerRemarcacao({ id: "x", profissional, dia: "2026-11-10", hora: "14:15" });
    expect(r.ok ? [] : Object.keys(r.erros)).toEqual(["_geral"]);
  });
});

describe("proximosStatus", () => {
  it("agendado antes do início: confirmar ou cancelar", () =>
    expect(proximosStatus("agendado", false)).toEqual(["confirmado", "cancelado"]));
  it("agendado depois do início: também concluir e faltou", () =>
    expect(proximosStatus("agendado", true)).toEqual(["confirmado", "concluido", "faltou", "cancelado"]));
  it("confirmado não volta a confirmar", () => expect(proximosStatus("confirmado", true)).toEqual(["concluido", "faltou", "cancelado"]));
  it("cancelado e faltou podem ser desfeitos", () => {
    expect(proximosStatus("cancelado", false)).toEqual(["agendado"]);
    expect(proximosStatus("faltou", true)).toEqual(["agendado"]);
  });
  it("concluído é final", () => expect(proximosStatus("concluido", true)).toEqual([]));
});

describe("lerMudancaDeStatus", () => {
  const id = "00000000-0000-4000-a000-000000000001";
  it("aceita status conhecido", () => expect(lerMudancaDeStatus({ id, status: "faltou" })).toEqual({ id, status: "faltou" }));
  it("recusa status desconhecido ou id inválido", () => {
    expect(lerMudancaDeStatus({ id, status: "apagado" })).toBeNull();
    expect(lerMudancaDeStatus({ id: "1", status: "cancelado" })).toBeNull();
  });
});

describe("lerAgendamentoPublico", () => {
  const base = {
    servico: "11111111-1111-4111-8111-111111111111",
    profissional: "",
    dia: "2030-01-08",
    hora: "10:30",
    nome: "  Carla   Souza ",
    telefone: "(11) 98765-4321",
  };
  it("aceita qualquer profissional e normaliza nome e WhatsApp", () => {
    expect(lerAgendamentoPublico({ ...base, optin: true })).toEqual({
      ok: true,
      valor: {
        servico: base.servico,
        profissional: null,
        inicio: "2030-01-08T10:30",
        nome: "Carla Souza",
        telefone: "+5511987654321",
        optin: true,
      },
    });
  });
  it("aceita profissional escolhido", () => {
    const r = lerAgendamentoPublico({ ...base, profissional: "22222222-2222-4222-8222-222222222222" });
    expect(r.ok && r.valor.profissional).toBe("22222222-2222-4222-8222-222222222222");
    expect(r.ok && r.valor.optin).toBe(false);
  });
  it("aponta cada campo inválido", () => {
    const r = lerAgendamentoPublico({ servico: "x", profissional: "y", dia: "2030-02-30", hora: "25:00", nome: "A", telefone: "123" });
    expect(r.ok).toBe(false);
    expect(Object.keys(r.ok ? {} : r.erros).sort()).toEqual(["dia", "hora", "nome", "profissional", "servico", "telefone"]);
  });
});

describe("lerConvite e lerMembro", () => {
  const agenda = "00000000-0000-4000-e000-000000000001";
  it("aceita e normaliza", () => {
    expect(lerConvite({ nome: "  Rita   Souza ", email: " Rita@Salao.com.BR ", perfil: "recepcao", agenda: "" })).toEqual({
      ok: true,
      valor: { nome: "Rita Souza", email: "rita@salao.com.br", perfil: "recepcao", agenda: { tipo: "nenhuma" } },
    });
  });
  it("guarda a agenda escolhida ou nova", () => {
    const r = lerMembro({ nome: "Ana", perfil: "profissional", agenda });
    expect(r.ok && r.valor.agenda).toEqual({ tipo: "existente", id: agenda });
    const n = lerMembro({ nome: "Ana", perfil: "profissional", agenda: "nova" });
    expect(n.ok && n.valor.agenda).toEqual({ tipo: "nova" });
  });
  it("Profissional precisa de agenda; Dono(a) e Recepção não", () => {
    const r = lerMembro({ nome: "Ana", perfil: "profissional", agenda: "" });
    expect(r.ok ? {} : r.erros).toEqual({ agenda: "Escolha a agenda desse profissional (ou crie uma nova)." });
    expect(lerMembro({ nome: "Ana", perfil: "dono", agenda: "" }).ok).toBe(true);
  });
  it("junta os erros de todos os campos", () => {
    const r = lerConvite({ nome: "A", email: "sem-arroba", perfil: "gerente", agenda: "x" });
    expect(Object.keys(r.ok ? {} : r.erros).sort()).toEqual(["agenda", "email", "nome", "perfil"]);
  });
  it("só e-mail inválido", () => {
    const r = lerConvite({ nome: "Ana", email: "ana@", perfil: "dono" });
    expect(r.ok ? {} : r.erros).toEqual({ email: "Informe um e-mail válido." });
  });
});

describe("lerDadosSalao", () => {
  const base = { nome: "Studio Bela Vida", fuso: "America/Sao_Paulo" };
  it("só nome e fuso: o resto vira null", () => {
    const r = lerDadosSalao(base);
    expect(r.ok && r.valor).toEqual({
      nome: "Studio Bela Vida", fuso: "America/Sao_Paulo", whatsapp: null, email: null, instagram: null,
      cep: null, logradouro: null, numero: null, complemento: null, bairro: null, cidade: null, uf: null,
    });
  });
  it("normaliza contatos e endereço", () => {
    const r = lerDadosSalao({
      ...base, whatsapp: "(11) 98765-4321", email: " Contato@Bela.com.BR ", instagram: "@studio.bela",
      cep: "01001-000", logradouro: " Rua  das Flores ", numero: "120", bairro: "Centro", cidade: "São Paulo", uf: "sp",
    });
    expect(r.ok && r.valor).toMatchObject({
      whatsapp: "+5511987654321", email: "contato@bela.com.br", instagram: "studio.bela",
      cep: "01001000", logradouro: "Rua das Flores", uf: "SP",
    });
  });
  it("aponta cada campo inválido", () => {
    const r = lerDadosSalao({ nome: "S", fuso: "Europe/Lisbon", whatsapp: "123", email: "x@", instagram: "a b", cep: "123", uf: "XX" });
    expect(Object.keys(r.ok ? {} : r.erros).sort()).toEqual(["cep", "email", "fuso", "instagram", "nome", "uf", "whatsapp"]);
  });
  it("lerInstagram aceita o link do perfil", () => {
    expect(lerInstagram("https://www.instagram.com/studio.bela/")).toBe("studio.bela");
    expect(lerInstagram("@")).toBeNull();
  });
});

describe("formatarEndereco", () => {
  it("junta só as partes preenchidas", () => {
    expect(formatarEndereco({ logradouro: "Rua das Flores", numero: "120", bairro: "Centro", cidade: "São Paulo", uf: "SP" }))
      .toBe("Rua das Flores, 120 - Centro - São Paulo/SP");
    expect(formatarEndereco({ cidade: "Recife", uf: "PE" })).toBe("Recife/PE");
    expect(formatarEndereco({})).toBeNull();
  });
});
