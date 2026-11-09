"use client";

import { useActionState } from "react";
import { Alerta, Botao, Campo } from "@/components/ui";
import { definirNovaSenha, type EstadoForm } from "../actions";

export function FormNovaSenha() {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(definirNovaSenha, {});

  return (
    <form action={acao} className="mt-6 flex flex-col gap-4" noValidate>
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
      <Campo
        id="senha"
        name="senha"
        type="password"
        label="Nova senha"
        autoComplete="new-password"
        minLength={8}
        required
        ajuda="Mínimo de 8 caracteres."
      />
      <Campo
        id="confirmacao"
        name="confirmacao"
        type="password"
        label="Repita a nova senha"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <Botao type="submit" disabled={pendente} className="mt-2 w-full">
        {pendente ? "Salvando…" : "Salvar nova senha"}
      </Botao>
    </form>
  );
}
