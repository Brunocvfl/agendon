"use client";

import { useActionState } from "react";
import { Alerta, Botao, Campo } from "@/components/ui";
import { cadastrar, type EstadoForm } from "../actions";
import { ReenviarConfirmacao } from "../reenviar-confirmacao";
import { CampoSenhaNova } from "@/components/campo-senha-nova";

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
      <CampoSenhaNova />
      <Botao type="submit" disabled={pendente} className="mt-2 w-full">
        {pendente ? "Criando conta…" : "Criar conta"}
      </Botao>
    </form>
  );
}
