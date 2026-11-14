"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { Alerta, Botao, Selecao } from "@/components/ui";
import { ANTECEDENCIAS_LEMBRETE, LEMBRETE_DESLIGADO, rotuloAntecedencia } from "@/lib/regras/lembrete";
import { salvarLembrete, type EstadoForm } from "./actions";

export function FormLembrete({ inicial }: { inicial: number | null }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(salvarLembrete, {});
  const [valor, setValor] = useState(inicial === null ? LEMBRETE_DESLIGADO : String(inicial));

  // Sem o reset automático do <form action> (voltaria o <select> controlado à primeira opção).
  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => acao(fd));
  };

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
      <Selecao
        id="lembrete_horas"
        rotulo="Quando enviar"
        valor={valor}
        onChange={setValor}
        opcoes={[
          ...ANTECEDENCIAS_LEMBRETE.map((h) => ({ valor: String(h), rotulo: rotuloAntecedencia(h) })),
          { valor: LEMBRETE_DESLIGADO, rotulo: rotuloAntecedencia(null) },
        ]}
        erro={estado.erros?.lembrete_horas}
      />
      {estado.ok && !pendente ? <Alerta tipo="sucesso">{estado.ok}</Alerta> : null}
      <div className="flex justify-end">
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar"}
        </Botao>
      </div>
    </form>
  );
}
