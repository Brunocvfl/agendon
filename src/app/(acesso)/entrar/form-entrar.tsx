"use client";

import { useActionState } from "react";
import { Alerta, Botao, Campo } from "@/components/ui";
import { entrar, type EstadoForm } from "../actions";

export function FormEntrar({ next, aviso }: { next: string; aviso?: string }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(entrar, {});

  return (
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
      <Campo id="senha" name="senha" type="password" label="Senha" autoComplete="current-password" required />
      <Botao type="submit" disabled={pendente} className="mt-2 w-full">
        {pendente ? "Entrando…" : "Entrar"}
      </Botao>
    </form>
  );
}
