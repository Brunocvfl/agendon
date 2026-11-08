// Componentes básicos de interface (marca AgendOn).
import type { ComponentProps, ReactNode } from "react";

export function Botao({
  variante = "primario",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: "primario" | "secundario" }) {
  const estilos =
    variante === "primario"
      ? "bg-on text-white hover:bg-on/90 disabled:bg-on/50"
      : "border border-noite/15 bg-white text-noite hover:bg-fundo disabled:opacity-50";
  return (
    <button
      className={`inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on disabled:cursor-not-allowed ${estilos} ${className}`}
      {...props}
    />
  );
}

export function Campo({
  label,
  erro,
  ajuda,
  id,
  ...props
}: ComponentProps<"input"> & { label: string; erro?: string; ajuda?: ReactNode; id: string }) {
  const descricao = erro ? `${id}-erro` : ajuda ? `${id}-ajuda` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-noite/80">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricao}
        className={`h-11 rounded-xl border bg-white px-3.5 text-base text-noite outline-none transition-colors placeholder:text-noite/35 focus:border-on focus:ring-2 focus:ring-on/20 ${erro ? "border-red-400" : "border-noite/15"}`}
        {...props}
      />
      {erro ? (
        <p id={`${id}-erro`} className="text-sm text-red-600">
          {erro}
        </p>
      ) : ajuda ? (
        <p id={`${id}-ajuda`} className="text-sm text-noite/55">
          {ajuda}
        </p>
      ) : null}
    </div>
  );
}

export function Alerta({ tipo, children }: { tipo: "erro" | "sucesso"; children: ReactNode }) {
  const estilos =
    tipo === "erro"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-confirmado/30 bg-confirmado/10 text-noite";
  return (
    <div role={tipo === "erro" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${estilos}`}>
      {children}
    </div>
  );
}

export function Cartao({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-noite/8 bg-white p-6 shadow-sm sm:p-8 ${className}`}>
      {children}
    </div>
  );
}
