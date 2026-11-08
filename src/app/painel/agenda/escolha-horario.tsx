"use client";

// Dia, horário, horários livres e encaixe: a parte comum do novo agendamento e da remarcação.
import { useEffect, useState, type ReactNode } from "react";
import { SeletorHora } from "@/components/seletor-hora";
import { rotuloData } from "@/lib/datas";
import { horariosLivres } from "./actions";

const CAMPO =
  "h-11 w-auto rounded-xl border bg-white px-3.5 text-base text-noite outline-none transition-colors focus:border-on focus:ring-2 focus:ring-on/20";

type Props = {
  profissional: string;
  servico: string;
  /** Agendamento que está sendo remarcado (não ocupa o próprio horário). */
  ignorar?: string;
  dia: string;
  onDia: (dia: string) => void;
  hora: string;
  onHora: (hora: string) => void;
  erros: Record<string, string>;
  /** Duração e preço, ao lado do horário. */
  info?: ReactNode;
  /** Muda a cada resposta do servidor: recarrega os livres (ex.: depois de um conflito). */
  recarregar?: unknown;
};

export function EscolhaHorario({ profissional, servico, ignorar, dia, onDia, hora, onHora, erros, info, recarregar }: Props) {
  const [encaixe, setEncaixe] = useState(false);
  const chave = `${profissional}|${servico}|${dia}`;
  const [livres, setLivres] = useState<{ chave: string; horas: string[] } | null>(null);
  const horas = livres?.chave === chave ? livres.horas : null;

  useEffect(() => {
    let ativo = true;
    if (!servico) return;
    horariosLivres(profissional, servico, dia, ignorar).then((h) => {
      if (ativo) setLivres({ chave: `${profissional}|${servico}|${dia}`, horas: h });
    });
    return () => {
      ativo = false;
    };
  }, [profissional, servico, dia, ignorar, recarregar]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dia" className="text-sm font-medium text-noite/80">
            Dia
          </label>
          <input
            id="dia"
            name="dia"
            type="date"
            value={dia}
            onChange={(e) => onDia(e.target.value)}
            className={`${CAMPO} ${erros.dia ? "border-red-400" : "border-noite/15"}`}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-noite/80">Horário</span>
          <SeletorHora name="hora" rotulo="Horário" valor={hora} onChange={onHora} />
        </div>
        {info ? <p className="pb-2.5 text-sm text-noite/55">{info}</p> : null}
      </div>
      {erros.dia || erros.hora ? (
        <p role="alert" className="text-sm text-red-600">
          {erros.hora ?? erros.dia}
        </p>
      ) : null}

      <div>
        <p className="text-sm text-noite/60">
          Livres em {dia ? rotuloData(dia) : "—"}
          {horas === null ? "…" : horas.length === 0 ? ": nenhum horário livre neste dia." : ":"}
        </p>
        {horas && horas.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {horas.slice(0, 16).map((h) => (
              <li key={h}>
                <button
                  type="button"
                  onClick={() => onHora(h)}
                  aria-pressed={hora === h}
                  className={`h-9 rounded-lg px-3 text-sm font-medium tabular-nums transition-colors ${
                    hora === h ? "bg-on text-white" : "bg-on/10 text-on hover:bg-on/15"
                  }`}
                >
                  {h}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {erros.encaixe || encaixe ? (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {erros.encaixe ? <p className="font-medium">{erros.encaixe}</p> : null}
          <label className="mt-1 flex items-center gap-2">
            <input
              type="checkbox"
              name="encaixe"
              checked={encaixe}
              onChange={(e) => setEncaixe(e.target.checked)}
              className="size-4 accent-on"
            />
            Agendar mesmo assim (encaixe)
          </label>
        </div>
      ) : null}
    </div>
  );
}
