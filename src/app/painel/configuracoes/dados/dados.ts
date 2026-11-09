import "server-only";
import { createClient } from "@/lib/supabase/server";

export type DadosSalao = {
  nome: string;
  slug: string;
  fuso: string;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  logoPath: string | null;
};

export async function carregarDadosSalao(salaoId: string): Promise<DadosSalao> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salons")
    .select("nome, slug, fuso, whatsapp, email, instagram, cep, logradouro, numero, complemento, bairro, cidade, uf, logo_path")
    .eq("id", salaoId)
    .single();
  if (error) throw new Error("Falha ao carregar os dados do salão.");
  const { logo_path, ...resto } = data;
  return { ...resto, logoPath: logo_path };
}
