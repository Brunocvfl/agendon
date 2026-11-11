"use client";

import Link from "next/link";
import { useActionState } from "react";
import { aceitarNovosTermos } from "@/app/(acesso)/actions";
import { Botao } from "@/components/ui";

// Pede o novo aceite quando a versão dos Termos/Política mudou. Cobre o painel até a pessoa aceitar.
export function AvisoNovosTermos({ data }: { data: string }) {
  const [estado, acao, pendente] = useActionState(aceitarNovosTermos, {});

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-noite/60 p-4 sm:items-center">
      <form
        action={acao}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-novos-termos"
        className="w-full max-w-md rounded-2xl bg-white p-6 text-noite shadow-xl"
      >
        <h2 id="titulo-novos-termos" className="text-lg font-semibold">
          Atualizamos os Termos e a Política de Privacidade
        </h2>
        <p className="mt-2 text-sm text-noite/75">
          A nova versão ({data}) explica melhor o nosso papel com os dados dos seus clientes, a transferência
          internacional de dados, a segurança da informação e como pedir a exclusão de dados. Para continuar usando o
          AgendOn, leia e aceite.
        </p>
        <label className="mt-4 flex items-start gap-3 text-sm text-noite/75">
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
        {estado.erro ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {estado.erro}
          </p>
        ) : null}
        <Botao type="submit" disabled={pendente} className="mt-5 w-full">
          {pendente ? "Registrando…" : "Aceitar e continuar"}
        </Botao>
      </form>
    </div>
  );
}
