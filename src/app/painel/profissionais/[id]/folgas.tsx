"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { SeletorHora } from "@/components/seletor-hora";
import { Alerta, Botao, Campo } from "@/components/ui";
import { LIMITES_FOLGA, proximoDia, type ModoFolga } from "@/lib/regras/folga";
import { adicionarFolga, removerFolga, type EstadoForm } from "../actions";

type Folga = { id: string; inicio: string; fim: string; motivo: string | null };
type Props = { id: string; folgas: Folga[]; fuso: string; podeEditar: boolean };

// "AAAA-MM-DD" do instante no fuso do salão.
const dataNoFuso = (d: Date, fuso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

// "19 nov" / "qua, 19 nov" a partir de "AAAA-MM-DD" (sem fuso: a data já é do salão).
function rotuloDia(data: string, comSemana = false) {
  const d = new Date(`${data}T12:00:00Z`);
  const parte = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", ...o }).format(d).replace(".", "");
  const dia = `${parte({ day: "2-digit" })} ${parte({ month: "short" })}`;
  return comSemana ? `${parte({ weekday: "short" })}, ${dia}` : dia;
}

function formatarPeriodo(inicio: string, fim: string, fuso: string) {
  const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, hour: "2-digit", minute: "2-digit" });
  const i = new Date(inicio);
  const f = new Date(fim);
  const di = dataNoFuso(i, fuso);
  const df = dataNoFuso(f, fuso);

  // Dias inteiros: de 00:00 a 00:00 (fim exclusivo); o último dia é o anterior ao fim.
  if (hora.format(i) === "00:00" && hora.format(f) === "00:00") {
    const ultimo = proximoDia(df, -1);
    if (ultimo === di) return rotuloDia(di, true);
    return di.slice(0, 7) === ultimo.slice(0, 7)
      ? `${di.slice(8)} a ${rotuloDia(ultimo)}`
      : `${rotuloDia(di)} a ${rotuloDia(ultimo)}`;
  }
  return di === df
    ? `${rotuloDia(di, true)} · ${hora.format(i)}–${hora.format(f)}`
    : `${rotuloDia(di, true)} ${hora.format(i)} até ${rotuloDia(df, true)} ${hora.format(f)}`;
}

export function Folgas({ id, folgas, fuso, podeEditar }: Props) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(adicionarFolga, {});
  // Envio sem o reset automático do <form action>: o reset levaria os <select> controlados para a
  // primeira opção (05:00) sem mudar o estado. Num erro, nada se perde; após o sucesso, os campos
  // são remontados (versao) e voltam ao padrão.
  const [versao, setVersao] = useState(0);
  const [ultimo, setUltimo] = useState(estado);
  if (estado !== ultimo) {
    setUltimo(estado);
    if (estado.ok) setVersao((v) => v + 1);
  }
  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => acao(fd));
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      {folgas.length === 0 ? (
        <p className="text-sm text-noite/65">Nenhuma folga ou bloqueio marcado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {folgas.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 rounded-xl bg-fundo px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{f.motivo ?? "Bloqueio"}</p>
                <p className="text-noite/65">{formatarPeriodo(f.inicio, f.fim, fuso)}</p>
              </div>
              {podeEditar ? <RemoverFolga id={f.id} /> : null}
            </li>
          ))}
        </ul>
      )}

      {podeEditar ? (
        <form onSubmit={enviar} className="flex flex-col gap-4 border-t border-noite/8 pt-4" noValidate>
          <p className="text-sm font-medium">Adicionar folga ou bloqueio</p>
          {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
          {estado.ok ? <Alerta tipo="sucesso">{estado.ok}</Alerta> : null}
          <input type="hidden" name="id" value={id} />
          <Campo
            id="motivo"
            name="motivo"
            label="Descrição (opcional)"
            placeholder="Férias, compromisso…"
            maxLength={LIMITES_FOLGA.motivo.max}
            ajuda="Evite detalhes pessoais (por exemplo, motivo de saúde)."
            key={`motivo-${versao}`}
          />
          <Periodo key={`periodo-${versao}`} fuso={fuso} erro={estado.erros?.periodo} />
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

// "Remover" pede confirmação na própria linha e fica desabilitado enquanto envia (sem envio duplo).
function RemoverFolga({ id }: { id: string }) {
  const [confirmando, setConfirmando] = useState(false);
  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="shrink-0 text-sm font-medium text-red-700 hover:underline"
      >
        Remover
      </button>
    );
  }
  return (
    <form action={removerFolga} className="flex shrink-0 items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <BotaoConfirmarRemocao />
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="text-sm font-medium text-noite/70 hover:underline"
      >
        Manter
      </button>
    </form>
  );
}

function BotaoConfirmarRemocao() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      autoFocus
      className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700/90 disabled:bg-red-700/50"
    >
      {pending ? "Removendo…" : "Remover mesmo"}
    </button>
  );
}

const MODOS: { valor: ModoFolga; rotulo: string }[] = [
  { valor: "dia", rotulo: "Dia inteiro" },
  { valor: "horario", rotulo: "Horário" },
];

function Periodo({ fuso, erro }: { fuso: string; erro?: string }) {
  const [hoje] = useState(() => dataNoFuso(new Date(), fuso));
  const [modo, setModo] = useState<ModoFolga>("dia");
  const [de, setDe] = useState(hoje);
  const [ate, setAte] = useState(hoje);
  const [dia, setDia] = useState(hoje);
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFim, setHoraFim] = useState("10:00");

  const campoData =
    "h-10 rounded-lg border border-noite/12 bg-white px-3 text-[15px] font-medium tabular-nums text-noite outline-none transition-colors hover:border-on/50 focus:border-on focus:ring-2 focus:ring-on/20";

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">Período</legend>
      {/* Rádios nativos com cara de botões: setas do teclado e leitor de tela funcionam sem código extra. */}
      <div role="radiogroup" aria-label="Tipo de período" className="inline-flex w-fit rounded-xl bg-noite/[0.06] p-1">
        {MODOS.map((m) => (
          <label
            key={m.valor}
            className="cursor-pointer rounded-lg px-3.5 py-1.5 text-sm font-medium text-noite/65 transition-colors hover:text-noite has-[:checked]:bg-white has-[:checked]:text-noite has-[:checked]:shadow-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-on"
          >
            <input
              type="radio"
              name="modo"
              value={m.valor}
              checked={modo === m.valor}
              onChange={() => setModo(m.valor)}
              className="sr-only"
            />
            {m.rotulo}
          </label>
        ))}
      </div>

      {modo === "dia" ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-noite/70">
          <label htmlFor="folga-de">De</label>
          <input
            id="folga-de"
            type="date"
            name="dataInicio"
            value={de}
            onChange={(e) => {
              setDe(e.target.value);
              if (!ate || ate < e.target.value) setAte(e.target.value);
            }}
            className={campoData}
          />
          <label htmlFor="folga-ate">até</label>
          <input
            id="folga-ate"
            type="date"
            name="dataFim"
            value={ate}
            min={de || undefined}
            onChange={(e) => setAte(e.target.value)}
            className={campoData}
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm text-noite/70">
          <label htmlFor="folga-dia">Dia</label>
          <input
            id="folga-dia"
            type="date"
            name="data"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            className={campoData}
          />
          <SeletorHora name="horaInicio" rotulo="Começa às" valor={horaInicio} onChange={setHoraInicio} />
          <span>às</span>
          <SeletorHora name="horaFim" rotulo="Termina às" valor={horaFim} onChange={setHoraFim} />
        </div>
      )}

      {erro ? (
        <p role="alert" className="text-sm text-red-600">
          {erro}
        </p>
      ) : null}
    </fieldset>
  );
}
