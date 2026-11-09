"use client";

import { useActionState } from "react";
import { Alerta, Botao, Campo } from "@/components/ui";
import { definirNovaSenha, type EstadoForm } from "../actions";
import { CampoSenhaNova } from "@/components/campo-senha-nova";
import { LIMITES_SENHA } from "@/lib/regras/senha";

export function FormNovaSenha() {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(definirNovaSenha, {});

  return (
    <form action={acao} className="mt-6 flex flex-col gap-4" noValidate>
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
      <CampoSenhaNova label="Nova senha" />
      <Campo
        id="confirmacao"
        name="confirmacao"
        type="password"
        label="Repita a nova senha"
        autoComplete="new-password"
        minLength={LIMITES_SENHA.min}
        maxLength={LIMITES_SENHA.max}
        required
      />
      <Botao type="submit" disabled={pendente} className="mt-2 w-full">
        {pendente ? "Salvando…" : "Salvar nova senha"}
      </Botao>
    </form>
  );
}
