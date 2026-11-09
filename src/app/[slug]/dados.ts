// Dados da página pública de um salão (função pagina_publica no banco).
import "server-only";
import { clientePublico } from "@/lib/supabase/publico";

export type ServicoPublico = { id: string; nome: string; duracao_min: number; preco: number };
export type ProfissionalPublico = {
  id: string;
  nome: string;
  servicos: { id: string; duracao_min: number; preco: number }[];
};
export type PaginaPublica = {
  salao: { nome: string; endereco: string | null; fuso: string };
  servicos: ServicoPublico[];
  profissionais: ProfissionalPublico[];
};

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const slugValido = (slug: string) => slug.length >= 3 && slug.length <= 40 && SLUG_RE.test(slug);

/** Página do salão, ou null se o slug não existe ou o salão não está ativo. */
export async function carregarPaginaPublica(slug: string): Promise<PaginaPublica | null> {
  if (!slugValido(slug)) return null;
  const supabase = await clientePublico();
  const { data, error } = await supabase.rpc("pagina_publica", { p_slug: slug });
  if (error) throw new Error(`pagina_publica falhou (${error.code})`);
  return (data as PaginaPublica | null) ?? null;
}
