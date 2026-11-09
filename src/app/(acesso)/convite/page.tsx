import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Cartao } from "@/components/ui";
import { exigirUsuario, getAcesso } from "@/lib/auth";
import { NOME_PERFIL } from "@/lib/permissoes";
import { FormConvite } from "./form-convite";

export const metadata: Metadata = { title: "Convite · AgendOn" };

// Chega aqui pelo link do e-mail de convite (o /auth/confirmar já abriu a sessão) ou depois de
// entrar com um login que ainda tem convite pendente.
export default function PaginaConvite() {
  return (
    <Cartao>
      <Suspense fallback={<div className="h-80" />}>
        <Conteudo />
      </Suspense>
    </Cartao>
  );
}

async function Conteudo() {
  const usuario = await exigirUsuario();
  const acesso = await getAcesso();
  if (acesso?.status !== "convidado") redirect("/painel");

  return (
    <>
      <h1 className="text-2xl font-semibold">Bem-vindo(a) à equipe</h1>
      <p className="mt-2 text-sm text-noite/75">
        <strong className="font-semibold text-noite">{acesso.salaoNome}</strong> convidou você para usar o AgendOn
        como <strong className="font-semibold text-noite">{NOME_PERFIL[acesso.perfil]}</strong>.
      </p>
      <p className="mt-1 break-words text-sm text-noite/65">Login: {usuario.email ?? "sua conta"}</p>
      <FormConvite />
    </>
  );
}
