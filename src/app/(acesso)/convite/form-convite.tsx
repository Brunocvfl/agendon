"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alerta, Botao } from "@/components/ui";
import { CampoSenhaNova } from "@/components/campo-senha-nova";
import { aceitarConvite, type EstadoConvite } from "./actions";

export function FormConvite() {
  const [estado, acao, pendente] = useActionState<EstadoConvite, FormData>(aceitarConvite, {});

  return (
    <form action={acao} className="mt-6 flex flex-col gap-4" noValidate>
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
      <CampoSenhaNova label="Crie sua senha" />
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
        {pendente ? "Entrando…" : "Aceitar convite e entrar"}
      </Botao>
    </form>
  );
}
