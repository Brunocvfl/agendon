"use client";

// O mostrador 3D e, ao lado, os últimos horários que "chegaram" (a mesma sequência do mostrador).
import { useState } from "react";
import { horaDaFatia, MARCACOES, Mostrador3D } from "./mostrador-3d";

export function PalcoDoDia() {
  const [quantas, setQuantas] = useState(0);
  const ultimas = MARCACOES.slice(0, quantas).slice(-3).reverse();

  return (
    <div className="relative">
      <p className="sr-only">
        Ilustração: um mostrador com as meias horas do dia, das 8h às 20h. Os horários vão sendo marcados por clientes e
        acendem quando a confirmação sai no WhatsApp.
      </p>
      <div aria-hidden className="relative aspect-[5/4] w-full lg:aspect-square">
        {/* Halo azul atrás do anel. */}
        <div className="absolute inset-[12%] rounded-full bg-on/35 blur-[70px]" />
        <Mostrador3D aoMarcar={setQuantas} />
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="text-[clamp(3.5rem,9vw,6.5rem)] leading-none font-extralight tracking-[-0.06em] text-white tabular-nums">
              {String(quantas).padStart(2, "0")}
            </p>
            <p className="mt-1 text-sm text-white/80">horários marcados</p>
          </div>
        </div>
      </div>

      <ol aria-hidden className="mx-auto -mt-4 hidden min-h-[9.5rem] max-w-80 content-start gap-2 lg:grid">
        {ultimas.map((m, i) => (
          <li
            key={m.cliente}
            className={`flex items-center gap-3 rounded-2xl bg-white/[0.08] px-3.5 py-2.5 text-sm ring-1 ring-white/15 backdrop-blur-md transition-opacity ${
              i === 0 ? "motion-safe:animate-chegar" : "opacity-70"
            }`}
          >
            <span className="font-light tracking-tight text-white tabular-nums">{horaDaFatia(m.fatia)}</span>
            <span className="min-w-0 flex-1 truncate text-white">
              <strong className="font-semibold">{m.cliente}</strong> <span className="text-white/80">{m.servico}</span>
            </span>
            <span className="size-2 shrink-0 rounded-full bg-confirmado shadow-[0_0_10px_2px_rgb(25_195_125/0.7)]" />
          </li>
        ))}
      </ol>
    </div>
  );
}
