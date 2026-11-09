"use client";

import { useActionState, useState } from "react";
import { Alerta, Botao } from "@/components/ui";
import { cancelarConvite, desativar, reativar, reenviarConvite, type EstadoForm } from "./actions";

const ACOES = {
  reenviar: { acao: reenviarConvite, rotulo: "Reenviar convite", confirmar: null },
  cancelar: {
    acao: cancelarConvite,
    rotulo: "Cancelar convite",
    confirmar: { pergunta: "Cancelar o convite? O link enviado deixa de funcionar.", sim: "Sim, cancelar convite" },
  },
  desativar: {
    acao: desativar,
    rotulo: "Desativar acesso",
    confirmar: {
      pergunta: "Desativar o acesso? A pessoa sai do painel na hora. Os agendamentos e o histórico continuam.",
      sim: "Sim, desativar",
    },
  },
  reativar: { acao: reativar, rotulo: "Reativar acesso", confirmar: null },
} as const;

export type AcaoAcesso = keyof typeof ACOES;

/** Um botão de acesso (com confirmação quando a ação corta o acesso). */
export function AcaoDeAcesso({ id, tipo }: { id: string; tipo: AcaoAcesso }) {
  const { acao: servidor, rotulo, confirmar } = ACOES[tipo];
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(servidor, {});
  const [confirmando, setConfirmando] = useState(false);

  return (
    <form action={acao} className="flex flex-col gap-3">
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
      <input type="hidden" name="id" value={id} />
      {confirmar && confirmando ? (
        <div role="alertdialog" aria-label={rotulo} className="flex flex-col gap-3 rounded-xl bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{confirmar.pergunta}</p>
          <div className="flex flex-wrap gap-3">
            <Botao type="submit" variante="perigo" disabled={pendente} autoFocus>
              {pendente ? "Salvando…" : confirmar.sim}
            </Botao>
            <Botao type="button" variante="secundario" disabled={pendente} onClick={() => setConfirmando(false)}>
              Voltar
            </Botao>
          </div>
        </div>
      ) : confirmar ? (
        <Botao type="button" variante="secundario" className="text-red-700 sm:self-start" onClick={() => setConfirmando(true)}>
          {rotulo}
        </Botao>
      ) : (
        <Botao type="submit" variante="secundario" disabled={pendente} className="sm:self-start">
          {pendente ? "Enviando…" : rotulo}
        </Botao>
      )}
    </form>
  );
}
