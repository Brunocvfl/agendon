import type { Metadata } from "next";
import Link from "next/link";
import { Cartao } from "@/components/ui";
import { FormCadastro } from "./form-cadastro";

export const metadata: Metadata = { title: "Criar conta · AgendOn" };

export default function PaginaCadastro() {
  return (
    <Cartao>
      <h1 className="text-2xl font-semibold">Crie sua conta</h1>
      <p className="mt-1 text-sm text-noite/60">
        Primeiro a conta de acesso; depois você cadastra o salão.
      </p>
      <FormCadastro />
      <p className="mt-6 text-center text-sm text-noite/70">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-semibold text-on hover:underline">
          Entrar
        </Link>
      </p>
    </Cartao>
  );
}
