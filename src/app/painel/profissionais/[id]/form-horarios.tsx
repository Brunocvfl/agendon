"use client";

import { useActionState, useState } from "react";
import { SeletorHora } from "@/components/seletor-hora";
import { Alerta, Botao } from "@/components/ui";
import { DIAS, type DiaTela } from "@/lib/horarios";
import { salvarHorarios, type EstadoForm } from "../actions";

const paraMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

// Régua da barra do dia: 06h às 22h, ampliada se algum horário sair dessa faixa.
function calcularRegua(dias: DiaTela[]) {
  let ini = 6 * 60;
  let fim = 22 * 60;
  for (const d of dias) {
    if (!d.trabalha || !d.inicio || !d.fim) continue;
    ini = Math.min(ini, Math.floor(paraMin(d.inicio) / 60) * 60);
    fim = Math.max(fim, Math.ceil(paraMin(d.fim) / 60) * 60);
  }
  return { ini, fim };
}

export function FormHorarios({ id, dias: inicial }: { id: string; dias: DiaTela[] }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(salvarHorarios, {});
  const [dias, setDias] = useState(inicial);
  const regua = calcularRegua(dias);
  const marcas = [6, 9, 12, 15, 18, 21].map((h) => h * 60).filter((m) => m >= regua.ini && m <= regua.fim);

  function alterar(dia: number, mudanca: Partial<DiaTela>) {
    setDias((atual) =>
      atual.map((d) => {
        if (d.dia !== dia) return d;
        const novo = { ...d, ...mudanca };
        // Ao ligar um dia vazio, sugere horário comercial.
        if (mudanca.trabalha && !d.inicio && !d.fim) Object.assign(novo, { inicio: "09:00", fim: "18:00" });
        return novo;
      }),
    );
  }

  const modelo = DIAS.map(({ n }) => dias.find((d) => d.dia === n)!).find((d) => d.trabalha);
  const nomeModelo = modelo ? DIAS.find((x) => x.n === modelo.dia)!.nome : null;
  const outrosMarcados = dias.filter((d) => d.trabalha).length > 1;

  function repetir() {
    if (!modelo) return;
    const { inicio, fim, intervaloInicio, intervaloFim } = modelo;
    setDias((atual) => atual.map((d) => (d.trabalha ? { ...d, inicio, fim, intervaloInicio, intervaloFim } : d)));
  }

  return (
    <form action={acao} className="mt-5 flex flex-col gap-5" noValidate>
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
      {estado.ok ? <Alerta tipo="sucesso">{estado.ok}</Alerta> : null}
      <input type="hidden" name="id" value={id} />

      <div>
        {/* Régua de horas, uma vez, alinhada com as barras (só em telas largas) */}
        <div aria-hidden className="mb-1 hidden pl-[9.5rem] sm:block">
          <div className="relative h-4 text-[11px] tabular-nums text-noite/40">
            {marcas.map((m) => (
              <span
                key={m}
                className="absolute -translate-x-1/2"
                style={{ left: `${((m - regua.ini) / (regua.fim - regua.ini)) * 100}%` }}
              >
                {String(m / 60).padStart(2, "0")}h
              </span>
            ))}
          </div>
        </div>

        <ul className="flex flex-col">
          {DIAS.map(({ n, nome }) => (
            <LinhaDia
              key={n}
              nome={nome}
              d={dias.find((x) => x.dia === n)!}
              regua={regua}
              erro={estado.erros?.[`d${n}`]}
              alterar={(m) => alterar(n, m)}
            />
          ))}
        </ul>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {nomeModelo && outrosMarcados ? (
          <button
            type="button"
            onClick={repetir}
            className="text-left text-sm font-medium text-on underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on"
          >
            Usar o horário de {nomeModelo.toLowerCase()} nos outros dias marcados
          </button>
        ) : (
          <span />
        )}
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar horários"}
        </Botao>
      </div>
    </form>
  );
}

type LinhaProps = {
  nome: string;
  d: DiaTela;
  regua: { ini: number; fim: number };
  erro?: string;
  alterar: (m: Partial<DiaTela>) => void;
};

function LinhaDia({ nome, d, regua, erro, alterar }: LinhaProps) {
  const n = d.dia;
  const temIntervalo = Boolean(d.intervaloInicio || d.intervaloFim);

  return (
    <li className="border-b border-noite/8 py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 sm:flex-nowrap">
        {/* Dia + liga/desliga */}
        <label className="flex w-[8.5rem] shrink-0 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name={`d${n}_trabalha`}
            checked={d.trabalha}
            onChange={(e) => alterar({ trabalha: e.target.checked })}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="relative inline-flex h-6 w-10 shrink-0 items-center rounded-full bg-noite/15 transition-colors peer-checked:bg-confirmado peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-on [&>span]:translate-x-1 peer-checked:[&>span]:translate-x-5"
          >
            <span className="inline-block size-4 rounded-full bg-white shadow-sm transition-transform" />
          </span>
          <span className={`font-medium ${d.trabalha ? "" : "text-noite/45"}`}>{nome}</span>
        </label>

        {d.trabalha ? (
          <div className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-2 text-sm text-noite/60">
              <SeletorHora name={`d${n}_inicio`} rotulo={`${nome}, começa`} valor={d.inicio} onChange={(v) => alterar({ inicio: v })} />
              até
              <SeletorHora name={`d${n}_fim`} rotulo={`${nome}, termina`} valor={d.fim} onChange={(v) => alterar({ fim: v })} />
            </div>

            {temIntervalo ? (
              <div className="flex items-center gap-2 text-sm text-noite/60">
                <span>pausa</span>
                <SeletorHora
                  name={`d${n}_ii`}
                  rotulo={`${nome}, pausa começa`}
                  valor={d.intervaloInicio}
                  onChange={(v) => alterar({ intervaloInicio: v })}
                />
                –
                <SeletorHora
                  name={`d${n}_if`}
                  rotulo={`${nome}, pausa termina`}
                  valor={d.intervaloFim}
                  onChange={(v) => alterar({ intervaloFim: v })}
                />
                <button
                  type="button"
                  onClick={() => alterar({ intervaloInicio: "", intervaloFim: "" })}
                  aria-label={`Tirar a pausa de ${nome.toLowerCase()}`}
                  className="flex size-8 items-center justify-center rounded-full text-noite/40 hover:bg-noite/5 hover:text-noite focus-visible:outline-2 focus-visible:outline-on"
                >
                  <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => alterar({ intervaloInicio: "12:00", intervaloFim: "13:00" })}
                className="rounded-lg px-2 py-1.5 text-sm font-medium text-on hover:bg-on/5 focus-visible:outline-2 focus-visible:outline-on"
              >
                + Pausa
              </button>
            )}
          </div>
        ) : (
          <span className="text-sm text-noite/45">Não atende</span>
        )}
      </div>

      {/* Barra do dia: o expediente desenhado sobre a régua */}
      <div className="mt-3 sm:pl-[9.5rem]">
        <BarraDia d={d} regua={regua} />
      </div>

      {erro ? (
        <p role="alert" className="mt-2 text-sm text-red-600 sm:pl-[9.5rem]">
          {erro}
        </p>
      ) : null}
    </li>
  );
}

function BarraDia({ d, regua }: { d: DiaTela; regua: { ini: number; fim: number } }) {
  const total = regua.fim - regua.ini;
  const pos = (t: string) => ((paraMin(t) - regua.ini) / total) * 100;
  const valido = (a: string, b: string) => a && b && paraMin(a) < paraMin(b);

  const blocos: { de: string; ate: string }[] = [];
  if (d.trabalha && valido(d.inicio, d.fim)) {
    if (d.intervaloInicio && d.intervaloFim && valido(d.intervaloInicio, d.intervaloFim)) {
      blocos.push({ de: d.inicio, ate: d.intervaloInicio }, { de: d.intervaloFim, ate: d.fim });
    } else {
      blocos.push({ de: d.inicio, ate: d.fim });
    }
  }

  return (
    <div aria-hidden className="relative h-2.5 overflow-hidden rounded-full bg-noite/[0.06]">
      {blocos.map((b) => (
        <span
          key={b.de}
          className="absolute inset-y-0 rounded-full bg-on transition-[left,width] duration-200 motion-reduce:transition-none"
          style={{ left: `${pos(b.de)}%`, width: `${Math.max(0, pos(b.ate) - pos(b.de))}%` }}
        />
      ))}
    </div>
  );
}
