// Matriz de permissões do AgendOn (CLAUDE.md, "Matriz de permissões") em código.
// Única fonte da verdade no front-end para "este perfil pode fazer isto?".
// A RLS no banco continua sendo a garantia final; isto decide o que mostrar e para onde mandar.
// Puro: pode ser usado em Server e Client Components.
import type { Database } from "@/lib/supabase/database.types";

export type Perfil = Database["public"]["Enums"]["member_role"];

export type Permissao =
  | "ver-agenda-de-todos"
  | "criar-agendamento" // Profissional: só na própria agenda (a RLS restringe)
  | "ver-clientes" // inclui histórico e telefone
  | "editar-servicos" // serviços e preços
  | "editar-profissionais" // cadastro e serviços que cada um atende
  | "editar-horarios" // horário semanal e folgas
  | "editar-lembretes" // lembretes e link público
  | "gerenciar-salao"; // plano, cobrança e usuários

const MATRIZ: Record<Permissao, readonly Perfil[]> = {
  "ver-agenda-de-todos": ["dono", "recepcao"],
  "criar-agendamento": ["dono", "recepcao", "profissional"],
  "ver-clientes": ["dono", "recepcao"],
  "editar-servicos": ["dono"],
  "editar-profissionais": ["dono"],
  "editar-horarios": ["dono", "recepcao"],
  "editar-lembretes": ["dono"],
  "gerenciar-salao": ["dono"],
};

export function pode(perfil: Perfil, permissao: Permissao): boolean {
  return MATRIZ[permissao].includes(perfil);
}

export const NOME_PERFIL: Record<Perfil, string> = {
  dono: "Dono(a)",
  recepcao: "Recepção",
  profissional: "Profissional",
};
