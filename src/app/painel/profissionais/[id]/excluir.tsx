"use client";

import { useActionState, useState } from "react";
import { Alerta, Botao } from "@/components/ui";
import { excluirProfissional, type EstadoForm } from "../actions";

/** Excluir (arquivar) o profissional, com confirmação. */
export function ExcluirProfissional({ id, nome }: { id: string; nome: string }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(excluirProfissional, {});
  const [confirmando, setConfirmando] = useState(false);

  return (
    <form action={acao} className="mt-4 flex flex-col gap-3">
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
      <input type="hidden" name="id" value={id} />
      {confirmando ? (
        <div role="alertdialog" aria-label="Excluir profissional" className="flex flex-col gap-3 rounded-xl bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            Excluir {nome}? Sai da lista, da agenda e da página de agendamento, e não dá para desfazer. Os atendimentos
            antigos continuam no histórico dos clientes.
          </p>
          <div className="flex flex-wrap gap-3">
            <Botao type="submit" variante="perigo" disabled={pendente} autoFocus>
              {pendente ? "Excluindo…" : "Sim, excluir"}
            </Botao>
            <Botao type="button" variante="secundario" disabled={pendente} onClick={() => setConfirmando(false)}>
              Voltar
            </Botao>
          </div>
        </div>
      ) : (
        <Botao type="button" variante="secundario" className="text-red-700 sm:self-start" onClick={() => setConfirmando(true)}>
          Excluir profissional
        </Botao>
      )}
    </form>
  );
}
