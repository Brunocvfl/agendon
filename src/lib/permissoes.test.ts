import { describe, expect, it } from "vitest";
import { pode, type Perfil, type Permissao } from "./permissoes";

// Espelho da tabela "Matriz de permissões" do CLAUDE.md (dono, recepção, profissional).
const ESPERADO: [Permissao, boolean, boolean, boolean][] = [
  ["ver-agenda-de-todos", true, true, false],
  ["criar-agendamento", true, true, true],
  ["ver-clientes", true, true, false],
  ["editar-servicos", true, false, false],
  ["editar-profissionais", true, false, false],
  ["editar-horarios", true, true, false],
  ["editar-lembretes", true, false, false],
  ["gerenciar-salao", true, false, false],
];

describe("Permissões", () => {
  it.each(ESPERADO)("%s: dono=%s, recepção=%s, profissional=%s", (permissao, dono, recepcao, profissional) => {
    const real = (["dono", "recepcao", "profissional"] as Perfil[]).map((p) => pode(p, permissao));
    expect(real).toEqual([dono, recepcao, profissional]);
  });
});
