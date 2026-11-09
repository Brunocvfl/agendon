"use server";

import { acaoDoPainel, ERRO_GERAL, texto, type EstadoForm } from "@/lib/acao";
import { ehCaminhoDeLogo } from "@/lib/logo";
import { lerDadosSalao } from "@/lib/regras/salao";
import { invalido, valido } from "@/lib/regras/resultado";
import type { createClient } from "@/lib/supabase/server";

export type { EstadoForm };

const CAMPOS = [
  "nome", "whatsapp", "email", "instagram", "fuso",
  "cep", "logradouro", "numero", "complemento", "bairro", "cidade", "uf",
] as const;

export const salvarDadosSalao = acaoDoPainel({
  permissao: "gerenciar-salao",
  devolver: CAMPOS,
  ler: (fd) => lerDadosSalao(Object.fromEntries(CAMPOS.map((c) => [c, texto(fd, c)]))),
  executar: (dados, { supabase, vinculo }) => supabase.from("salons").update(dados).eq("id", vinculo.salao.id),
  depois: { ok: "Dados do salão salvos." },
});

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Troca logo_path e apaga o arquivo anterior do Storage (se havia um e é deste salão). */
async function trocarLogo(supabase: Supabase, salaoId: string, nova: string | null) {
  const atual = await supabase.from("salons").select("logo_path").eq("id", salaoId).single();
  if (atual.error) return { error: atual.error };
  const { error } = await supabase.from("salons").update({ logo_path: nova }).eq("id", salaoId);
  if (error) return { error };
  const antiga = atual.data.logo_path;
  if (antiga && antiga !== nova) await supabase.storage.from("logos").remove([antiga]);
  return { error: null };
}

// A logo já foi enviada pelo navegador (Storage, policy do Dono(a)); aqui só liga ao salão.
export const salvarLogo = acaoDoPainel({
  permissao: "gerenciar-salao",
  ler: (fd, vinculo) => {
    const caminho = texto(fd, "caminho");
    return ehCaminhoDeLogo(vinculo.salao.id, caminho)
      ? valido({ caminho })
      : invalido<{ caminho: string }>({ [ERRO_GERAL]: "Não foi possível usar essa imagem. Tente de novo." });
  },
  executar: ({ caminho }, { supabase, vinculo }) => trocarLogo(supabase, vinculo.salao.id, caminho),
  depois: { ok: "Logo atualizada." },
});

export const removerLogo = acaoDoPainel({
  permissao: "gerenciar-salao",
  ler: () => valido(null),
  executar: (_v, { supabase, vinculo }) => trocarLogo(supabase, vinculo.salao.id, null),
  depois: { ok: "Logo removida." },
});
