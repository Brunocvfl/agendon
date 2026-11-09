"use client";

import { useActionState } from "react";
import { Alerta, Botao, Campo } from "@/components/ui";
import { esqueciSenha, type EstadoForm } from "../actions";

export function FormEsqueciSenha() {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(esqueciSenha, {});

  if (estado.sucesso) {
    return (
      <div className="mt-6 flex flex-col gap-4">
        <Alerta tipo="sucesso">{estado.sucesso}</Alerta>
        <p className="text-sm text-noite/70">
          Não chegou? Procure também em <strong>Spam</strong> ou <strong>Lixo eletrônico</strong>. O link vale por 1
          hora.
        </p>
      </div>
    );
  }

  return (
    <form action={acao} className="mt-6 flex flex-col gap-4" noValidate>
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
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
      <Botao type="submit" disabled={pendente} className="mt-2 w-full">
        {pendente ? "Enviando…" : "Enviar link"}
      </Botao>
    </form>
  );
}
