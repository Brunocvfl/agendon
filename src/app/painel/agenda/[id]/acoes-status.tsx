"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Alerta, Botao } from "@/components/ui";
import type { Status } from "@/lib/regras/agendamento";
import { mudarStatus, type EstadoForm } from "../actions";

const ROTULO: Record<Status, string> = {
  confirmado: "Confirmar",
  concluido: "Concluir",
  faltou: "Marcar falta",
  cancelado: "Cancelar agendamento",
  agendado: "Desfazer (voltar para agendado)",
};

const PRINCIPAL: Status[] = ["confirmado", "concluido"];

// Ações que liberam o horário: pedem confirmação antes de enviar.
const CONFIRMAR: Partial<Record<Status, { pergunta: string; sim: string }>> = {
  cancelado: { pergunta: "Cancelar este agendamento? O horário fica livre para outra pessoa.", sim: "Sim, cancelar" },
  faltou: { pergunta: "Marcar que o cliente faltou? O horário fica livre.", sim: "Sim, marcar falta" },
};

/** Botões de status (um formulário, um botão por destino) e, ao lado, o que vier em children (Remarcar). */
export function AcoesStatus({ id, acoes, children }: { id: string; acoes: Status[]; children?: ReactNode }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(mudarStatus, {});
  const [confirmando, setConfirmando] = useState<Status | null>(null);
  // Fecha a confirmação quando o servidor responde (deu certo ou não).
  const [ultimo, setUltimo] = useState(estado);
  if (estado !== ultimo) {
    setUltimo(estado);
    setConfirmando(null);
  }
  const pedido = confirmando ? CONFIRMAR[confirmando] : undefined;

  return (
    <form action={acao} className="mt-4 flex flex-col gap-4">
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
      {estado.ok && !pendente ? <Alerta tipo="sucesso">{estado.ok}</Alerta> : null}
      <input type="hidden" name="id" value={id} />

      {confirmando && pedido ? (
        <div role="alertdialog" aria-label={ROTULO[confirmando]} className="flex flex-col gap-3 rounded-xl bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{pedido.pergunta}</p>
          <div className="flex flex-wrap gap-3">
            <Botao
              type="submit"
              name="status"
              value={confirmando}
              disabled={pendente}
              variante="perigo"
              autoFocus
            >
              {pendente ? "Salvando…" : pedido.sim}
            </Botao>
            <Botao type="button" variante="secundario" disabled={pendente} onClick={() => setConfirmando(null)}>
              Voltar
            </Botao>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {acoes.map((s) =>
            CONFIRMAR[s] ? (
              <Botao
                key={s}
                type="button"
                disabled={pendente}
                variante="secundario"
                className="text-red-700"
                onClick={() => setConfirmando(s)}
              >
                {ROTULO[s]}
              </Botao>
            ) : (
              <Botao
                key={s}
                type="submit"
                name="status"
                value={s}
                disabled={pendente}
                variante={PRINCIPAL.includes(s) ? "primario" : "secundario"}
              >
                {ROTULO[s]}
              </Botao>
            ),
          )}
          {children}
        </div>
      )}
    </form>
  );
}
