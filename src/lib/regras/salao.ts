// Regras do Salão no cadastro: nome e endereço da página pública (slug).
// Espelham o banco (salons_* e app.slug_reservado). O teste salao.test.ts confere a lista com a migration.
import { lerTelefone } from "./cliente";
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

// --- Dados do salão (Configurações) --------------------------------------------
// Espelham o banco (migration dados_salao: salons_*_formato, salons_*_tamanho, salons_uf_valida, salons_fuso_brasil).

export const LIMITES_DADOS_SALAO = {
  email: { max: 254 },
  instagram: { max: 30 },
  logradouro: { min: 2, max: 120 },
  numero: { max: 20 },
  complemento: { max: 60 },
  bairro: { min: 2, max: 80 },
  cidade: { min: 2, max: 80 },
} as const;

/** Fusos do Brasil, com o nome que o salão reconhece. */
export const FUSOS_BRASIL = [
  { valor: "America/Sao_Paulo", rotulo: "Brasília (UTC−3): maior parte do país" },
  { valor: "America/Noronha", rotulo: "Fernando de Noronha (UTC−2)" },
  { valor: "America/Manaus", rotulo: "Amazonas (UTC−4)" },
  { valor: "America/Cuiaba", rotulo: "Mato Grosso e Mato Grosso do Sul (UTC−4)" },
  { valor: "America/Porto_Velho", rotulo: "Rondônia (UTC−4)" },
  { valor: "America/Boa_Vista", rotulo: "Roraima (UTC−4)" },
  { valor: "America/Rio_Branco", rotulo: "Acre (UTC−5)" },
] as const;

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR",
  "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export type DadosSalaoValidos = {
  nome: string;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  fuso: string;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
};

type EntradaDadosSalao = Partial<Record<keyof DadosSalaoValidos, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "@studio.bela" ou "instagram.com/studio.bela/" -> "studio.bela"; null se inválido. */
export function lerInstagram(texto: string): string | null {
  const t = texto.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/.*$/, "").replace(/^@/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(t) ? t : null;
}

/** "01001-000" -> "01001000"; null se não tiver 8 dígitos. */
export function lerCep(texto: string): string | null {
  const d = texto.replace(/\D/g, "");
  return d.length === 8 ? d : null;
}

/** Contatos e endereço: tudo opcional, menos o nome e o fuso. Texto vazio vira null. */
export function lerDadosSalao(e: EntradaDadosSalao): Resultado<DadosSalaoValidos> {
  const L = LIMITES_DADOS_SALAO;
  const erros: ErrosPorCampo = {};
  const opcional = (campo: keyof DadosSalaoValidos) => limparTexto(e[campo]) || null;
  const tamanho = (campo: "logradouro" | "bairro" | "cidade" | "numero" | "complemento", min: number, max: number, msg: string) => {
    const v = opcional(campo);
    if (v !== null && (v.length < min || v.length > max)) erros[campo] = msg;
    return v;
  };

  const nome = limparTexto(e.nome);
  const n = LIMITES_SALAO.nome;
  if (nome.length < n.min || nome.length > n.max) erros.nome = `Informe o nome do salão (${n.min} a ${n.max} caracteres).`;

  const whatsappTexto = opcional("whatsapp");
  const whatsapp = whatsappTexto ? lerTelefone(whatsappTexto) : null;
  if (whatsappTexto && !whatsapp) erros.whatsapp = "Informe o WhatsApp com DDD, por exemplo (11) 98765-4321.";

  const email = opcional("email")?.toLowerCase() ?? null;
  if (email && (!EMAIL_RE.test(email) || email.length > L.email.max)) erros.email = "Informe um e-mail válido.";

  const instagramTexto = opcional("instagram");
  const instagram = instagramTexto ? lerInstagram(instagramTexto) : null;
  if (instagramTexto && !instagram) erros.instagram = "Use só o nome do perfil, por exemplo @studiobelavida.";

  const fuso = (e.fuso ?? "").trim();
  if (!FUSOS_BRASIL.some((f) => f.valor === fuso)) erros.fuso = "Escolha o fuso horário.";

  const cepTexto = opcional("cep");
  const cep = cepTexto ? lerCep(cepTexto) : null;
  if (cepTexto && !cep) erros.cep = "O CEP tem 8 números.";

  const logradouro = tamanho("logradouro", L.logradouro.min, L.logradouro.max, `Use de ${L.logradouro.min} a ${L.logradouro.max} caracteres.`);
  const numero = tamanho("numero", 1, L.numero.max, `Use até ${L.numero.max} caracteres.`);
  const complemento = tamanho("complemento", 1, L.complemento.max, `Use até ${L.complemento.max} caracteres.`);
  const bairro = tamanho("bairro", L.bairro.min, L.bairro.max, `Use de ${L.bairro.min} a ${L.bairro.max} caracteres.`);
  const cidade = tamanho("cidade", L.cidade.min, L.cidade.max, `Use de ${L.cidade.min} a ${L.cidade.max} caracteres.`);

  const ufTexto = opcional("uf")?.toUpperCase() ?? null;
  if (ufTexto && !(UFS as readonly string[]).includes(ufTexto)) erros.uf = "Escolha a UF.";

  return Object.keys(erros).length > 0
    ? invalido(erros)
    : valido({ nome, whatsapp, email, instagram, fuso, cep, logradouro, numero, complemento, bairro, cidade, uf: ufTexto });
}

export type EnderecoSalao = Partial<Record<"logradouro" | "numero" | "complemento" | "bairro" | "cidade" | "uf" | "cep", string | null>>;

/** "Rua das Flores, 120 - Sala 2 - Centro - São Paulo/SP" (só as partes preenchidas); null se não houver nada. */
export function formatarEndereco(e: EnderecoSalao): string | null {
  const rua = e.logradouro ? [e.logradouro, e.numero].filter(Boolean).join(", ") : null;
  const cidade = e.cidade ? [e.cidade, e.uf].filter(Boolean).join("/") : null;
  const partes = [rua, e.complemento, e.bairro, cidade].filter(Boolean);
  return partes.length > 0 ? partes.join(" - ") : null;
}
