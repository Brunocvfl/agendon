import type { Metadata } from "next";
import { Suspense } from "react";
import { Cartao } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { FormNovaSenha } from "./form-nova-senha";

export const metadata: Metadata = { title: "Nova senha · AgendOn" };

// Chega aqui pelo link do e-mail de troca de senha: o /auth/callback já abriu a sessão.
export default function PaginaNovaSenha() {
  return (
    <Cartao>
      <h1 className="text-2xl font-semibold">Crie uma nova senha</h1>
      <Suspense fallback={<div className="mt-6 h-56" />}>
        <Conteudo />
      </Suspense>
    </Cartao>
  );
}

async function Conteudo() {
  const usuario = await exigirUsuario();
  return (
    <>
      <p className="mt-1 break-words text-sm text-noite/65">Conta: {usuario.email ?? "sua conta"}</p>
      <FormNovaSenha />
    </>
  );
}
