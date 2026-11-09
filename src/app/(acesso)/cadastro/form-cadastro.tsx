"use client";

import Link from "next/link";
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
      <label className="flex items-start gap-3 text-sm text-noite/75">
        <input
          type="checkbox"
          name="aceite"
          value="sim"
          required
          className="mt-0.5 size-5 shrink-0 rounded border-noite/30 accent-on"
        />
        <span>
          Li e aceito os{" "}
          <Link href="/termos" target="_blank" className="font-semibold text-on hover:underline">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" target="_blank" className="font-semibold text-on hover:underline">
            Política de Privacidade
          </Link>
          .
        </span>
      </label>
      <Botao type="submit" disabled={pendente} className="mt-2 w-full">
        {pendente ? "Criando conta…" : "Criar conta"}
      </Botao>
    </form>
  );
}
