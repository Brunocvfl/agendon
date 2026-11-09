"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alerta, Botao, Campo } from "@/components/ui";
import { entrar, type EstadoForm } from "../actions";
import { ReenviarConfirmacao } from "../reenviar-confirmacao";

export function FormEntrar({ next, aviso }: { next: string; aviso?: string }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(entrar, {});

  return (
    <>
      <form action={acao} className="mt-6 flex flex-col gap-4" noValidate>
        {aviso && !estado.erro ? <Alerta tipo="sucesso">{aviso}</Alerta> : null}
        {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
        <input type="hidden" name="next" value={next} />
        <Campo
          id="email"
          name="email"
          type="email"
          label="E-mail"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={estado.campos?.email}
        />
        <div>
          <Campo id="senha" name="senha" type="password" label="Senha" autoComplete="current-password" required />
          <Link href="/esqueci-senha" className="mt-2 inline-block text-sm font-semibold text-on hover:underline">
            Esqueci a senha
          </Link>
        </div>
        <Botao type="submit" disabled={pendente} className="mt-2 w-full">
          {pendente ? "Entrando…" : "Entrar"}
        </Botao>
      </form>
      {estado.naoConfirmado && estado.campos?.email ? <ReenviarConfirmacao email={estado.campos.email} /> : null}
    </>
  );
}
