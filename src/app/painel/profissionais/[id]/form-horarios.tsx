"use client";

import { useActionState, useState } from "react";
import { Alerta, Botao } from "@/components/ui";
import { DIAS, type DiaTela } from "@/lib/horarios";
import { salvarHorarios, type EstadoForm } from "../actions";

const campoHora =
  "h-10 w-[8rem] rounded-lg border border-noite/15 bg-white px-2 text-sm outline-none focus:border-on focus:ring-2 focus:ring-on/20 disabled:bg-fundo disabled:text-noite/30";

export function FormHorarios({ id, dias: inicial }: { id: string; dias: DiaTela[] }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(salvarHorarios, {});
  const [dias, setDias] = useState(inicial);

  function alterar(dia: number, mudanca: Partial<DiaTela>) {
    setDias((atual) =>
      atual.map((d) => {
        if (d.dia !== dia) return d;
        const novo = { ...d, ...mudanca };
        // Ao marcar um dia vazio, sugere um horário comercial.
        if (mudanca.trabalha && !d.inicio && !d.fim) Object.assign(novo, { inicio: "09:00", fim: "18:00" });
        return novo;
      }),
    );
  }

  // Copia o horário do primeiro dia marcado para todos os outros dias marcados.
  function repetir() {
    const modelo = DIAS.map(({ n }) => dias.find((d) => d.dia === n)!).find((d) => d.trabalha);
    if (!modelo) return;
    setDias((atual) =>
      atual.map((d) =>
        d.trabalha
          ? { ...d, inicio: modelo.inicio, fim: modelo.fim, intervaloInicio: modelo.intervaloInicio, intervaloFim: modelo.intervaloFim }
          : d,
      ),
    );
  }

  return (
    <form action={acao} className="mt-4 flex flex-col gap-4" noValidate>
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
      {estado.ok ? <Alerta tipo="sucesso">{estado.ok}</Alerta> : null}
      <input type="hidden" name="id" value={id} />

      <div className="hidden grid-cols-[6rem_1fr_1fr] gap-4 text-xs font-semibold uppercase tracking-wider text-noite/50 sm:grid">
        <span>Dia</span>
        <span>Atende</span>
        <span>Intervalo (opcional)</span>
      </div>

      <ul className="flex flex-col divide-y divide-noite/8">
        {DIAS.map(({ n, curto, nome }) => {
          const d = dias.find((x) => x.dia === n)!;
          const erro = estado.erros?.[`d${n}`];
          return (
            <li key={n} className="py-3">
              <div className="grid items-center gap-3 sm:grid-cols-[6rem_1fr_1fr] sm:gap-4">
                <label className="flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    name={`d${n}_trabalha`}
                    checked={d.trabalha}
                    onChange={(e) => alterar(n, { trabalha: e.target.checked })}
                    className="size-4 accent-on"
                  />
                  <span title={nome}>{curto}</span>
                  {!d.trabalha ? <span className="text-sm font-normal text-noite/45 sm:hidden">Folga</span> : null}
                </label>
                {d.trabalha ? (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        type="time"
                        name={`d${n}_inicio`}
                        aria-label={`${nome}: início`}
                        value={d.inicio}
                        onChange={(e) => alterar(n, { inicio: e.target.value })}
                        className={campoHora}
                      />
                      às
                      <input
                        type="time"
                        name={`d${n}_fim`}
                        aria-label={`${nome}: fim`}
                        value={d.fim}
                        onChange={(e) => alterar(n, { fim: e.target.value })}
                        className={campoHora}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        type="time"
                        name={`d${n}_ii`}
                        aria-label={`${nome}: começo do intervalo`}
                        value={d.intervaloInicio}
                        onChange={(e) => alterar(n, { intervaloInicio: e.target.value })}
                        className={campoHora}
                      />
                      –
                      <input
                        type="time"
                        name={`d${n}_if`}
                        aria-label={`${nome}: fim do intervalo`}
                        value={d.intervaloFim}
                        onChange={(e) => alterar(n, { intervaloFim: e.target.value })}
                        className={campoHora}
                      />
                    </div>
                  </>
                ) : (
                  <span className="hidden text-sm text-noite/45 sm:col-span-2 sm:block">Folga</span>
                )}
              </div>
              {erro ? <p className="mt-1 text-sm text-red-600">{erro}</p> : null}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Botao type="button" variante="secundario" onClick={repetir}>
          Repetir o 1º dia nos outros
        </Botao>
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar horários"}
        </Botao>
      </div>
    </form>
  );
}
