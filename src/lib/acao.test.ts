import { beforeEach, describe, expect, it, vi } from "vitest";

// Dependências do Next e da sessão substituídas: o teste cruza só a interface da Ação do painel.
vi.mock("server-only", () => ({}));
const refresh = vi.fn();
vi.mock("next/cache", () => ({ refresh: () => refresh() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
const exigirPermissao = vi.fn();
vi.mock("@/lib/auth", () => ({ exigirPermissao: (...a: unknown[]) => exigirPermissao(...a) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

const { acaoDoPainel, traduzirErroBanco, ERRO_GERAL } = await import("./acao");
const { invalido, valido } = await import("./regras/resultado");

const VINCULO = { membroId: "m1", perfil: "dono", salao: { id: "s1", nome: "S", slug: "s", fuso: "America/Sao_Paulo" } };
const form = (dados: Record<string, string>) => {
  const fd = new FormData();
  Object.entries(dados).forEach(([k, v]) => fd.set(k, v));
  return fd;
};

beforeEach(() => {
  refresh.mockClear();
  exigirPermissao.mockReset().mockResolvedValue(VINCULO);
});

describe("traduzirErroBanco", () => {
  it.each([
    ["23505", "duplicado"],
    ["23P01", "conflito"],
    ["42501", "sem-permissao"],
    ["23514", "invalido"],
    ["P0002", "nao-encontrado"],
    ["XX000", "outro"],
  ])("%s -> %s", (code, tipo) => expect(traduzirErroBanco({ code })).toBe(tipo));
});

describe("acaoDoPainel", () => {
  const executar = vi.fn();
  const acao = acaoDoPainel({
    permissao: "editar-servicos",
    senao: "/voltar",
    devolver: ["nome"],
    ler: (fd: FormData) => (fd.get("nome") ? valido({ nome: String(fd.get("nome")) }) : invalido({ nome: "Obrigatório." })),
    executar,
    mensagens: { duplicado: { campo: "nome", msg: "Nome repetido." } },
    depois: { ok: "Salvo." },
  });

  beforeEach(() => executar.mockReset().mockResolvedValue({ error: null }));

  it("exige a permissão declarada", async () => {
    await acao({}, form({ nome: "Corte" }));
    expect(exigirPermissao).toHaveBeenCalledWith("editar-servicos", "/voltar");
  });

  it("erro de leitura volta por campo, com o que foi digitado, sem ir ao banco", async () => {
    const estado = await acao({}, form({ nome: "" }));
    expect(estado).toEqual({ erro: undefined, erros: { nome: "Obrigatório." }, campos: { nome: "" } });
    expect(executar).not.toHaveBeenCalled();
  });

  it("erro do banco vira a mensagem declarada", async () => {
    executar.mockResolvedValue({ error: { code: "23505" } });
    expect((await acao({}, form({ nome: "Corte" }))).erros).toEqual({ nome: "Nome repetido." });
  });

  it("erro do banco sem mensagem declarada usa a padrão", async () => {
    executar.mockResolvedValue({ error: { code: "42501" } });
    expect((await acao({}, form({ nome: "Corte" }))).erro).toBe("Seu perfil não permite essa alteração.");
  });

  it("sucesso atualiza a tela e confirma", async () => {
    expect(await acao({}, form({ nome: "Corte" }))).toEqual({ ok: "Salvo." });
    expect(executar).toHaveBeenCalledWith({ nome: "Corte" }, expect.objectContaining({ vinculo: VINCULO }));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("erro geral da leitura aparece no alerta", async () => {
    const semId = acaoDoPainel({
      permissao: "editar-horarios",
      ler: () => invalido({ [ERRO_GERAL]: "Inválido." }),
      executar,
      depois: { ok: "x" },
    });
    expect((await semId({}, form({}))).erro).toBe("Inválido.");
  });

  it("depois com destino redireciona com o dado gravado", async () => {
    executar.mockResolvedValue({ error: null, data: { id: "p9" } });
    const criar = acaoDoPainel({
      permissao: "editar-profissionais",
      ler: () => valido({}),
      executar,
      depois: { ir: (d: { id: string }) => `/painel/profissionais/${d.id}` },
    });
    await expect(criar({}, form({}))).rejects.toThrow("REDIRECT:/painel/profissionais/p9");
  });
});
