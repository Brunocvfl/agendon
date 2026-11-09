// Regras do Salão no cadastro: nome e endereço da página pública (slug).
// Espelham o banco (salons_* e app.slug_reservado). O teste salao.test.ts confere a lista com a migration.
import { invalido, limparTexto, valido, type ErrosPorCampo, type Resultado } from "./resultado";

export const LIMITES_SALAO = { nome: { min: 2, max: 80 }, slug: { min: 3, max: 40 } } as const;

export const SLUGS_RESERVADOS = [
  "admin", "agendon", "ajuda", "api", "app", "auth", "blog", "cadastro", "cadastrar",
  "conta", "contato", "convite", "convites", "criar-salao", "dashboard", "entrar", "equipe",
  "esqueci-senha", "login", "logout", "nova-senha", "painel", "planos", "precos", "privacidade",
  "sair", "salao", "senha", "signup", "static", "status", "suporte", "termos", "webhook",
  "webhooks", "www",
] as const;

// "Studio Bela Vida!" -> "studio-bela-vida"
export function normalizarSlug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LIMITES_SALAO.slug.max)
    .replace(/-+$/g, "");
}

export type SalaoValido = { nome: string; slug: string };

export function lerSalao(entrada: { nome?: string; slug?: string }): Resultado<SalaoValido> {
  const { nome: n, slug: s } = LIMITES_SALAO;
  const erros: ErrosPorCampo = {};

  const nome = limparTexto(entrada.nome);
  if (nome.length < n.min || nome.length > n.max) erros.nome = `Informe o nome do salão (${n.min} a ${n.max} caracteres).`;

  const slug = normalizarSlug(entrada.slug ?? "");
  if (slug.length < s.min || slug.length > s.max) {
    erros.slug = `O endereço precisa ter de ${s.min} a ${s.max} caracteres.`;
  } else if ((SLUGS_RESERVADOS as readonly string[]).includes(slug)) {
    erros.slug = "Este endereço é reservado pelo AgendOn. Tente outro.";
  }

  return Object.keys(erros).length > 0 ? invalido(erros) : valido({ nome, slug });
}
