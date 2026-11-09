"use server";

import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { VERSAO_DOCUMENTOS } from "@/lib/legal";
import { erroDaSenha } from "@/lib/regras/senha";
import { createClient } from "@/lib/supabase/server";

export type EstadoConvite = { erro?: string };

// Aceite do convite: cria a senha, registra o aceite dos Termos e ativa o vínculo com o salão.
export async function aceitarConvite(_anterior: EstadoConvite, fd: FormData): Promise<EstadoConvite> {
  await exigirUsuario();
  if (fd.get("aceite") !== "sim") return { erro: "Para entrar, aceite os Termos de Uso e a Política de Privacidade." };
  const senha = String(fd.get("senha") ?? "");
  const erroSenha = erroDaSenha(senha);
  if (erroSenha) return { erro: erroSenha };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: senha,
    data: { termos_versao: VERSAO_DOCUMENTOS, termos_aceitos_em: new Date().toISOString() },
  });
  // Quem chegou por "Esqueci a senha" já criou a senha: repetir a mesma não é erro aqui.
  if (error && error.code !== "same_password") {
    return {
      erro:
        error.code === "weak_password"
          ? "Senha fraca. Use pelo menos 10 caracteres, com letra maiúscula, minúscula e número."
          : "Não foi possível salvar a senha agora. Tente de novo em instantes.",
    };
  }

  const aceite = await supabase.rpc("aceitar_convite");
  // P0002: o convite já tinha sido aceito (ou foi cancelado); o /painel decide para onde ir.
  if (aceite.error && aceite.error.code !== "P0002") return { erro: "Não foi possível aceitar o convite. Tente de novo." };

  redirect("/painel");
}
