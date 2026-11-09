"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { urlDoSite } from "@/lib/site";
import { destinoSeguro } from "@/lib/destino";
import { erroDaSenha } from "@/lib/regras/senha";
import { VERSAO_DOCUMENTOS } from "@/lib/legal";

export type EstadoForm = {
  erro?: string;
  sucesso?: string;
  campos?: { email?: string };
  /** Login recusado porque o e-mail ainda não foi confirmado: a tela oferece reenviar o link. */
  naoConfirmado?: boolean;
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
      return "Senha fraca. Use pelo menos 10 caracteres, com letra maiúscula, minúscula e número.";
    case "same_password":
      return "A nova senha precisa ser diferente da atual.";
    case "session_not_found":
    case "session_expired":
      return "Sua sessão expirou. Peça um novo link de troca de senha.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
    case "signup_disabled":
      return "Cadastros estão temporariamente desativados.";
    default:
      return "Não foi possível concluir agora. Tente de novo em instantes.";
  }
}

// Link dos e-mails de autenticação: passa pelo callback (troca o código pela sessão) e segue para `destino`.
async function linkDeRetorno(destino: string) {
  return `${await urlDoSite()}/auth/callback?next=${encodeURIComponent(destino)}`;
}

export async function entrar(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { email, senha } = lerCampos(formData);
  if (!EMAIL_RE.test(email) || !senha) {
    return { erro: "Informe e-mail e senha.", campos: { email } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    return { erro: mensagemAuth(error.code), campos: { email }, naoConfirmado: error.code === "email_not_confirmed" };
  }

  redirect(destinoSeguro(String(formData.get("next") ?? "")));
}

export async function cadastrar(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { email, senha } = lerCampos(formData);
  if (!EMAIL_RE.test(email)) return { erro: "Informe um e-mail válido.", campos: { email } };
  const erroSenha = erroDaSenha(senha);
  if (erroSenha) return { erro: erroSenha, campos: { email } };
  if (formData.get("aceite") !== "sim") {
    return { erro: "Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.", campos: { email } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      emailRedirectTo: await linkDeRetorno("/criar-salao"),
      // Registro do aceite (versão dos documentos e momento, pelo relógio do servidor).
      data: { termos_versao: VERSAO_DOCUMENTOS, termos_aceitos_em: new Date().toISOString() },
    },
  });
  if (error) return { erro: mensagemAuth(error.code), campos: { email } };

  // Mesma resposta para e-mail novo ou já cadastrado: não revela quem tem conta.
  return {
    sucesso: `Enviamos um link de confirmação para ${email}. Abra o e-mail neste mesmo navegador para continuar.`,
    campos: { email },
  };
}

// Reenvia o link de confirmação do cadastro. Mesma resposta exista a conta ou não.
export async function reenviarConfirmacao(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { email } = lerCampos(formData);
  if (!EMAIL_RE.test(email)) return { erro: "Informe um e-mail válido.", campos: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: await linkDeRetorno("/criar-salao") },
  });
  if (error && error.code !== "user_not_found") return { erro: mensagemAuth(error.code), campos: { email } };

  return { sucesso: `Se houver um cadastro pendente para ${email}, um novo link chegará em instantes.`, campos: { email } };
}

// Pede o link de troca de senha. Mesma resposta exista a conta ou não.
export async function esqueciSenha(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { email } = lerCampos(formData);
  if (!EMAIL_RE.test(email)) return { erro: "Informe um e-mail válido.", campos: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: await linkDeRetorno("/nova-senha"),
  });
  if (error && error.code !== "user_not_found") return { erro: mensagemAuth(error.code), campos: { email } };

  return {
    sucesso: `Se houver uma conta com ${email}, enviamos um link para criar uma nova senha. Abra o e-mail neste mesmo navegador.`,
    campos: { email },
  };
}

// Define a nova senha de quem chegou pelo link do e-mail (já com sessão).
export async function definirNovaSenha(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const senha = String(formData.get("senha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");
  const erroSenha = erroDaSenha(senha, confirmacao);
  if (erroSenha) return { erro: erroSenha };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return { erro: mensagemAuth(error.code) };

  redirect("/painel");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}
