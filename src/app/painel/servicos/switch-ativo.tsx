"use client";

import { useOptimistic, useTransition } from "react";
import { alternarAtivo } from "./actions";

// Liga/desliga o serviço. Mostra a mudança na hora e confirma com o servidor.
export function SwitchAtivo({ id, ativo, nome }: { id: string; ativo: boolean; nome: string }) {
  const [otimista, setOtimista] = useOptimistic(ativo);
  const [, startTransition] = useTransition();

  function alternar() {
    const proximo = !otimista;
    startTransition(async () => {
      setOtimista(proximo);
      const fd = new FormData();
      fd.set("id", id);
      fd.set("ativo", String(proximo));
      await alternarAtivo(fd);
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={otimista}
      // O estado já vem do aria-checked; o rótulo diz só o que o switch liga.
      aria-label={`${nome} ativo`}
      onClick={alternar}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on ${
        otimista ? "bg-confirmado" : "bg-noite/20"
      }`}
    >
      <span
        className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
          otimista ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
