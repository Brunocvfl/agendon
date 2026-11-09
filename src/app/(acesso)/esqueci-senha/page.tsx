import type { Metadata } from "next";
import Link from "next/link";
import { Cartao } from "@/components/ui";
import { FormEsqueciSenha } from "./form-esqueci-senha";

export const metadata: Metadata = { title: "Esqueci a senha · AgendOn" };

export default function PaginaEsqueciSenha() {
  return (
    <Cartao>
      <h1 className="text-2xl font-semibold">Esqueci a senha</h1>
      <p className="mt-1 text-sm text-noite/60">
        Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.
      </p>
      <FormEsqueciSenha />
      <p className="mt-6 text-center text-sm text-noite/70">
        Lembrou?{" "}
        <Link href="/entrar" className="font-semibold text-on hover:underline">
          Voltar para entrar
        </Link>
      </p>
    </Cartao>
  );
}
