import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cartao } from "@/components/ui";
import { FormEntrar } from "./form-entrar";

export const metadata: Metadata = { title: "Entrar · AgendOn" };

const AVISOS: Record<string, string> = {
  link: "O link expirou ou já foi usado. Entre com e-mail e senha ou peça um novo link em “Esqueci a senha”.",
  confirmado: "E-mail confirmado. Entre para continuar.",
};

export default function PaginaEntrar({ searchParams }: PageProps<"/entrar">) {
  return (
    <Cartao>
      <h1 className="text-2xl font-semibold">Entrar</h1>
      <p className="mt-1 text-sm text-noite/60">Acesse o painel do seu salão.</p>
      <Suspense fallback={<div className="mt-6 h-64" />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
      <p className="mt-6 text-center text-sm text-noite/70">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-on hover:underline">
          Cadastre seu salão
        </Link>
      </p>
    </Cartao>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/entrar">["searchParams"] }) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "";
  const aviso = typeof params.aviso === "string" ? AVISOS[params.aviso] : undefined;
  return <FormEntrar next={next} aviso={aviso} />;
}
