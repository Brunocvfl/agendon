"use client";

import { useActionState } from "react";
import { Alerta, Botao } from "@/components/ui";
import { salvarServicos, type EstadoForm } from "../actions";

type Props = { id: string; servicos: { id: string; nome: string }[]; marcados: string[] };

export function FormServicos({ id, servicos, marcados }: Props) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(salvarServicos, {});

  return (
    <form action={acao} className="mt-4 flex flex-col gap-4">
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
      {estado.ok ? <Alerta tipo="sucesso">{estado.ok}</Alerta> : null}
      <input type="hidden" name="id" value={id} />
      <fieldset>
        <legend className="sr-only">Serviços</legend>
        <div className="flex flex-wrap gap-2">
          {servicos.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-noite/15 px-3.5 py-2 text-sm has-[:checked]:border-on has-[:checked]:bg-on/5"
            >
              <input
                type="checkbox"
                name="servico"
                value={s.id}
                defaultChecked={marcados.includes(s.id)}
                className="size-4 accent-on"
              />
              {s.nome}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex justify-end">
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar serviços"}
        </Botao>
      </div>
    </form>
  );
}
