"use client";

import { useActionState } from "react";
import { Alerta, Botao, Campo } from "@/components/ui";
import { cadastrar, type EstadoForm } from "../actions";
import { ReenviarConfirmacao } from "../reenviar-confirmacao";

export function FormCadastro() {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(cadastrar, {});

  if (estado.sucesso) {
    return (
      <div className="mt-6">
        <Alerta tipo="sucesso">{estado.sucesso}</Alerta>
        {estado.campos?.email ? <ReenviarConfirmacao email={estado.campos.email} /> : null}
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
      <Campo
        id="senha"
        name="senha"
        type="password"
        label="Senha"
        autoComplete="new-password"
        minLength={8}
        required
        ajuda="Mínimo de 8 caracteres."
      />
      <Botao type="submit" disabled={pendente} className="mt-2 w-full">
        {pendente ? "Criando conta…" : "Criar conta"}
      </Botao>
    </form>
  );
}
