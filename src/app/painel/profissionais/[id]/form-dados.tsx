"use client";

import { useFocarPrimeiroErro } from "@/components/use-focar-erro";
import { useActionState } from "react";
import { Alerta, Botao, Campo } from "@/components/ui";
import { LIMITES_PROFISSIONAL } from "@/lib/regras/profissional";
import { salvarDados, type EstadoForm } from "../actions";

export function FormDados({ id, nome, ativo }: { id: string; nome: string; ativo: boolean }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(salvarDados, {});
  const form = useFocarPrimeiroErro(estado);

  return (
    <form ref={form} action={acao} className="mt-4 flex flex-col gap-4" noValidate>
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
      {estado.ok ? <Alerta tipo="sucesso">{estado.ok}</Alerta> : null}
      <input type="hidden" name="id" value={id} />
      <Campo id="nome" name="nome" label="Nome" defaultValue={nome} maxLength={LIMITES_PROFISSIONAL.nome.max} required erro={estado.erros?.nome} />
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="ativo" defaultChecked={ativo} className="size-4 accent-on" />
        Ativo (aparece na agenda e na página pública)
      </label>
      <div className="flex justify-end">
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar dados"}
        </Botao>
      </div>
    </form>
  );
}
