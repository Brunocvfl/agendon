import { describe, expect, it } from "vitest";
import type { ClientePublico } from "./publico";

// Teste de tipos (o tsc do CI confere): o cliente da página pública só chama as funções dela.
// Se uma linha marcada com @ts-expect-error passar a compilar, o typecheck falha.
function soTipos(c: ClientePublico) {
  void c.rpc("pagina_publica", { p_slug: "salao" });
  // @ts-expect-error ler tabela com a chave secreta não compila
  void c.from("clients");
  // @ts-expect-error função fora da lista não compila
  void c.rpc("whatsapp_optout", { p_telefones: [] });
  // @ts-expect-error função do painel não compila
  void c.rpc("anonimizar_cliente", { p_client: "x" });
}

describe("ClientePublico", () => {
  it("é restrito às funções da página pública (conferido pelo tsc)", () => expect(typeof soTipos).toBe("function"));
});
