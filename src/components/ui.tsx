// Componentes básicos de interface (marca AgendOn).
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variante = "primario" | "secundario";

const BASE_BOTAO =
  "inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on";
const VARIANTES: Record<Variante, string> = {
  primario: "bg-on text-white hover:bg-on/90 disabled:bg-on/50",
  secundario: "border border-noite/15 bg-white text-noite hover:bg-fundo disabled:opacity-50",
};

export function Botao({
  variante = "primario",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: Variante }) {
  return <button className={`${BASE_BOTAO} ${VARIANTES[variante]} disabled:cursor-not-allowed ${className}`} {...props} />;
}

// Link com cara de botão (navegação: "Novo serviço", "Cancelar"...).
export function BotaoLink({
  variante = "primario",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante }) {
  return <Link className={`${BASE_BOTAO} ${VARIANTES[variante]} ${className}`} {...props} />;
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

// Lista de escolha controlada (precisa de um Client Component para o onChange).
export function Selecao({
  id,
  rotulo,
  valor,
  onChange,
  opcoes,
  erro,
}: {
  id: string;
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  opcoes: { valor: string; rotulo: string }[];
  erro?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-noite/80">
        {rotulo}
      </label>
      <select
        id={id}
        name={id}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={erro ? true : undefined}
        className={`h-11 w-full cursor-pointer rounded-xl border bg-white px-3.5 text-base text-noite outline-none transition-colors focus:border-on focus:ring-2 focus:ring-on/20 ${erro ? "border-red-400" : "border-noite/15"}`}
      >
        {opcoes.length === 0 ? <option value="">—</option> : null}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      {erro ? <p className="text-sm text-red-600">{erro}</p> : null}
    </div>
  );
}
