"use client";

import { useActionState } from "react";
import { Alerta, Botao } from "@/components/ui";
import { reenviarConfirmacao, type EstadoForm } from "./actions";

// Reenvio do link de confirmação do cadastro, com dicas para quando o e-mail não chega.
export function ReenviarConfirmacao({ email }: { email: string }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(reenviarConfirmacao, {});

  return (
    <form action={acao} className="mt-4 flex flex-col gap-3 rounded-xl bg-fundo p-4 text-sm text-noite/70">
      <p>
        Não chegou? Procure também em <strong>Spam</strong> ou <strong>Lixo eletrônico</strong> e confira se o
        e-mail <strong className="break-all text-noite">{email}</strong> está certo.
      </p>
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
      {estado.sucesso ? <Alerta tipo="sucesso">{estado.sucesso}</Alerta> : null}
      <input type="hidden" name="email" value={email} />
      <Botao type="submit" variante="secundario" disabled={pendente} className="w-full">
        {pendente ? "Enviando…" : "Reenviar e-mail de confirmação"}
      </Botao>
    </form>
  );
}
