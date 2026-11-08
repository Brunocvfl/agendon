"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { destinoSeguro } from "@/lib/destino";

export type EstadoForm = {
  erro?: string;
  sucesso?: string;
  campos?: { email?: string };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function lerCampos(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    senha: String(formData.get("senha") ?? ""),
  };
}

// Mensagens em português para os códigos de erro do Supabase Auth. Nada de dado pessoal em log.
function mensagemAuth(code: string | undefined) {
  switch (code) {
    case "invalid_credentials":
      return "E-mail ou senha incorretos.";
    case "email_not_confirmed":
      return "Confirme seu e-mail antes de entrar. Procure o link que enviamos.";
    case "weak_password":
      return "Senha fraca. Use pelo menos 8 caracteres.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
    case "signup_disabled":
      return "Cadastros estão temporariamente desativados.";
    default:
      return "Não foi possível concluir agora. Tente de novo em instantes.";
  }
}

async function urlDoSite() {
  const configurada = process.env.NEXT_PUBLIC_SITE_URL;
  if (configurada) return configurada.replace(/\/$/, "");
  const h = await headers();
  return h.get("origin") ?? "http://localhost:3000";
}

export async function entrar(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { email, senha } = lerCampos(formData);
  if (!EMAIL_RE.test(email) || !senha) {
    return { erro: "Informe e-mail e senha.", campos: { email } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: mensagemAuth(error.code), campos: { email } };

  redirect(destinoSeguro(String(formData.get("next") ?? "")));
}

export async function cadastrar(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { email, senha } = lerCampos(formData);
  if (!EMAIL_RE.test(email)) return { erro: "Informe um e-mail válido.", campos: { email } };
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres.", campos: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { emailRedirectTo: `${await urlDoSite()}/auth/callback?next=/criar-salao` },
  });
  if (error) return { erro: mensagemAuth(error.code), campos: { email } };

  // Mesma resposta para e-mail novo ou já cadastrado: não revela quem tem conta.
  return {
    sucesso: `Enviamos um link de confirmação para ${email}. Abra o e-mail neste mesmo navegador para continuar.`,
  };
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}
