"use client";

// Horários oferecidos: de 05:00 a 23:45, de 15 em 15 minutos (sempre 24h, sem AM/PM).
export const OPCOES_HORA = Array.from({ length: (24 - 5) * 4 }, (_, i) => {
  const min = 5 * 60 + i * 15;
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
});

export function SeletorHora({
  name,
  rotulo,
  valor,
  onChange,
}: {
  name: string;
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
}) {
  // Mantém um horário salvo fora da grade de 15 min (ex.: 09:10) na lista.
  const opcoes = valor && !OPCOES_HORA.includes(valor) ? [...OPCOES_HORA, valor].sort() : OPCOES_HORA;
  return (
    <span className="relative inline-flex">
      <select
        name={name}
        aria-label={rotulo}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 cursor-pointer appearance-none rounded-lg border border-noite/12 bg-white py-0 pl-3 pr-8 text-[15px] font-medium tabular-nums text-noite outline-none transition-colors hover:border-on/50 focus:border-on focus:ring-2 focus:ring-on/20"
      >
        {!valor ? <option value="">--:--</option> : null}
        {opcoes.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 16 16"
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-noite/40"
      >
        <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
