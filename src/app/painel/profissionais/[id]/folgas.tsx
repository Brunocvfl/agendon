"use client";

import { useActionState } from "react";
import { Alerta, Botao, Campo } from "@/components/ui";
import { adicionarFolga, removerFolga, type EstadoForm } from "../actions";

type Folga = { id: string; inicio: string; fim: string; motivo: string | null };
type Props = { id: string; folgas: Folga[]; fuso: string; podeEditar: boolean };

function formatarPeriodo(inicio: string, fim: string, fuso: string) {
  const data = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, day: "2-digit", month: "short", weekday: "short" });
  const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, hour: "2-digit", minute: "2-digit" });
  const i = new Date(inicio);
  const f = new Date(fim);
  const mesmoDia = data.format(i) === data.format(f);
  return mesmoDia
    ? `${data.format(i)} · ${hora.format(i)}–${hora.format(f)}`
    : `${data.format(i)} ${hora.format(i)} até ${data.format(f)} ${hora.format(f)}`;
}

export function Folgas({ id, folgas, fuso, podeEditar }: Props) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(adicionarFolga, {});

  return (
    <div className="mt-4 flex flex-col gap-4">
      {folgas.length === 0 ? (
        <p className="text-sm text-noite/50">Nenhuma folga ou bloqueio marcado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {folgas.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 rounded-xl bg-fundo px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{f.motivo ?? "Bloqueio"}</p>
                <p className="text-noite/60">{formatarPeriodo(f.inicio, f.fim, fuso)}</p>
              </div>
              {podeEditar ? (
                <form action={removerFolga}>
                  <input type="hidden" name="id" value={f.id} />
                  <button type="submit" className="text-sm font-medium text-red-600 hover:underline">
                    Remover
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {podeEditar ? (
        <form action={acao} className="flex flex-col gap-4 border-t border-noite/8 pt-4" noValidate>
          <p className="text-sm font-medium">Adicionar folga ou bloqueio</p>
          {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
          {estado.ok ? <Alerta tipo="sucesso">{estado.ok}</Alerta> : null}
          <input type="hidden" name="id" value={id} />
          <Campo
            id="motivo"
            name="motivo"
            label="Descrição (opcional)"
            placeholder="Férias, compromisso…"
            maxLength={80}
            ajuda="Evite detalhes pessoais (por exemplo, motivo de saúde)."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="inicio" name="inicio" label="Começa em" type="datetime-local" required />
            <Campo id="fim" name="fim" label="Termina em" type="datetime-local" required erro={estado.erros?.periodo} />
          </div>
          <div className="flex justify-end">
            <Botao type="submit" variante="secundario" disabled={pendente}>
              {pendente ? "Adicionando…" : "Adicionar"}
            </Botao>
          </div>
        </form>
      ) : null}
    </div>
  );
}
