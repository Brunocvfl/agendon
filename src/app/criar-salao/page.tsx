import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Cartao } from "@/components/ui";
import { exigirUsuario, getVinculo } from "@/lib/auth";
import { FormSalao } from "./form-salao";
import { sair } from "@/app/(acesso)/actions";

export const metadata: Metadata = { title: "Cadastre seu salão · AgendOn" };

export default function PaginaCriarSalao() {
  return (
    <main id="conteudo" className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-16">
      <Image src="/logo-agendon.png" alt="AgendOn" width={192} height={58} priority className="mb-8 h-auto w-48" />
      <Cartao className="w-full max-w-lg">
        <p className="text-sm font-semibold text-on">Passo 2 de 2</p>
        <h1 className="mt-1 text-2xl font-semibold">Cadastre seu salão</h1>
        <p className="mt-1 text-sm text-noite/65">
          Você poderá completar endereço, horários e logo depois, nas configurações.
        </p>
        <Suspense fallback={<div className="mt-6 h-72" />}>
          <Guarda />
        </Suspense>
      </Cartao>
    </main>
  );
}

async function Guarda() {
  const usuario = await exigirUsuario();
  if (await getVinculo()) redirect("/painel");
  return (
    <>
      <FormSalao />
      <form action={sair} className="mt-6 text-center text-sm text-noite/65">
        Entrou como {usuario.email ?? "outra conta"}.{" "}
        <button type="submit" className="font-semibold text-on hover:underline">
          Sair
        </button>
      </form>
    </>
  );
}
