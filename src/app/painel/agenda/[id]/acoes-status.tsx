"use client";

import { useActionState, type ReactNode } from "react";
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

/** Botões de status (um formulário, um botão por destino) e, ao lado, o que vier em children (Remarcar). */
export function AcoesStatus({ id, acoes, children }: { id: string; acoes: Status[]; children?: ReactNode }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(mudarStatus, {});

  return (
    <form action={acao} className="mt-4 flex flex-col gap-4">
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
      {estado.ok && !pendente ? <Alerta tipo="sucesso">{estado.ok}</Alerta> : null}
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap gap-3">
        {acoes.map((s) => (
          <Botao
            key={s}
            type="submit"
            name="status"
            value={s}
            disabled={pendente}
            variante={PRINCIPAL.includes(s) ? "primario" : "secundario"}
            className={s === "cancelado" || s === "faltou" ? "text-red-700" : ""}
          >
            {ROTULO[s]}
          </Botao>
        ))}
        {children}
      </div>
    </form>
  );
}
