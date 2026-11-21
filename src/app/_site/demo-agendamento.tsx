"use client";

// Protótipo da página pública no topo do site: o visitante escolhe um horário, confirma
// e vê a mensagem que o cliente recebe no WhatsApp (texto igual ao template aprovado, TEXTOS em
// src/lib/whatsapp/template.ts). Dados fictícios; nada é enviado.
import { useState } from "react";

const DIAS = [
  { sigla: "seg", numero: 9 },
  { sigla: "ter", numero: 10 },
  { sigla: "qua", numero: 11 },
  { sigla: "qui", numero: 12 },
  { sigla: "sex", numero: 13 },
] as const;

const HORARIOS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

// Horários já ocupados em cada dia (a página pública só mostra livres; aqui riscados para dar contexto).
const OCUPADOS: string[][] = [
  ["09:00", "11:00", "15:00"],
  ["10:00", "10:30", "14:30", "16:30"],
  ["09:00", "11:30", "15:30", "16:00"],
  ["11:00", "14:00", "16:00"],
  ["09:30", "10:30", "15:00", "15:30"],
];

// fundoEscuro: o celular está sobre azul (versões 1 e 3); a dica embaixo fica branca.
export function DemoAgendamento({ fundoEscuro = false }: { fundoEscuro?: boolean }) {
  const corDica = fundoEscuro ? "text-white" : "text-noite/75";
  const [dia, setDia] = useState(2);
  const [hora, setHora] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);

  const rotuloDia = `${DIAS[dia].sigla}, ${DIAS[dia].numero}`;

  function recomecar() {
    setHora(null);
    setConfirmado(false);
  }

  return (
    <div className="relative mx-auto w-full max-w-[19.5rem] text-noite">
      {/* Celular */}
      <div className="relative overflow-hidden rounded-[2.6rem] border-[9px] border-noite bg-white shadow-[0_30px_60px_-20px_rgb(15_27_77/0.45)]">
        <div aria-hidden className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-noite/15" />
        <div className="flex items-center gap-3 px-4 pt-3 pb-3">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-on text-xs font-bold text-white">
            SB
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">Studio Bela Vida</p>
            <p className="truncate text-xs text-noite/65">Corte feminino com Ana Lima</p>
          </div>
        </div>
        <div aria-hidden className="grid grid-cols-4 gap-1.5 px-4">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-1 rounded-full ${i < (confirmado ? 4 : 3) ? "bg-on" : "bg-noite/10"}`} />
          ))}
        </div>

        <div className="min-h-[25.5rem] border-t border-noite/5 px-4 pt-4 pb-5 mt-3">
          {confirmado && hora ? (
            <div className="flex flex-col items-center pt-8 text-center motion-safe:animate-chegar">
              <span className="grid size-16 place-items-center rounded-full bg-confirmado/15">
                <svg aria-hidden viewBox="0 0 24 24" className="size-8 text-confirmado-escuro" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
              </span>
              <p className="mt-4 text-lg font-semibold">Horário marcado</p>
              <p className="mt-1 text-sm text-noite/70">
                {rotuloDia} às {hora}
              </p>
              <p className="mt-6 max-w-[14rem] text-sm text-noite/70">A confirmação foi enviada para o seu WhatsApp.</p>
              <button
                type="button"
                onClick={recomecar}
                className="mt-8 h-11 rounded-xl border border-noite/15 px-4 text-sm font-semibold hover:bg-fundo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on"
              >
                Escolher outro horário
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (hora) setConfirmado(true);
              }}
            >
              <p className="text-base font-semibold">Escolha o horário</p>
              <fieldset className="mt-3">
                <legend className="sr-only">Dia</legend>
                <div className="grid grid-cols-5 gap-1.5">
                  {DIAS.map((d, i) => (
                    <label
                      key={d.numero}
                      className="group flex cursor-pointer flex-col items-center rounded-xl border border-noite/10 py-1.5 text-noite has-checked:border-on has-checked:bg-on has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-on"
                    >
                      <input
                        type="radio"
                        name="dia"
                        className="sr-only"
                        checked={dia === i}
                        onChange={() => {
                          setDia(i);
                          setHora(null);
                        }}
                      />
                      <span className="text-[0.7rem] opacity-75 group-has-checked:opacity-100">{d.sigla}</span>
                      <span className="text-sm font-semibold tabular-nums">{d.numero}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="mt-4">
                <legend className="text-xs font-medium text-noite/65">Horários livres</legend>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {HORARIOS.map((h) => {
                    const ocupado = OCUPADOS[dia].includes(h);
                    return (
                      <label
                        key={h}
                        className={`grid h-9 place-items-center rounded-lg border text-sm tabular-nums ${
                          ocupado
                            ? "border-transparent bg-noite/[0.04] text-noite/35 line-through"
                            : "cursor-pointer border-noite/12 hover:border-on/50 has-checked:border-on has-checked:bg-on has-checked:font-semibold has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-on"
                        }`}
                      >
                        <input
                          type="radio"
                          name="hora"
                          className="sr-only"
                          disabled={ocupado}
                          checked={hora === h}
                          onChange={() => setHora(h)}
                        />
                        {h}
                        {ocupado && <span className="sr-only"> (ocupado)</span>}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={!hora}
                className="mt-5 h-11 w-full rounded-xl bg-confirmado-escuro text-sm font-semibold text-white transition-colors hover:bg-confirmado-escuro/90 disabled:cursor-not-allowed disabled:bg-noite/10 disabled:text-noite/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on"
              >
                {hora ? `Confirmar ${rotuloDia} às ${hora}` : "Escolha um horário"}
              </button>
            </form>
          )}
          <p className="mt-4 text-center text-[0.7rem] text-noite/65">Agendamento por AgendOn</p>
        </div>
      </div>

      <p className={`mt-5 hidden text-center text-sm lg:block ${corDica} ${confirmado ? "invisible" : ""}`}>
        Escolha um horário e confirme para ver a mensagem que o cliente recebe.
      </p>

      {/* Mensagem no WhatsApp: aparece ao confirmar. */}
      <div aria-live="polite" className="lg:absolute lg:-bottom-8 lg:-left-40 lg:w-[17rem]">
        {confirmado && hora ? (
          <div className="mt-5 rounded-2xl bg-white p-3.5 text-sm shadow-[0_18px_40px_-16px_rgb(15_27_77/0.4)] ring-1 ring-noite/5 motion-safe:animate-chegar motion-safe:[animation-delay:350ms] motion-safe:[animation-fill-mode:backwards] lg:mt-0">
            <div className="flex items-center justify-between text-xs text-noite/65">
              <span className="flex items-center gap-1.5 font-semibold text-confirmado-escuro">
                <IconeMensagem />
                WhatsApp
              </span>
              <span>agora</span>
            </div>
            <p className="mt-2 leading-relaxed">
              Olá, Marina! Seu horário no Studio Bela Vida está confirmado: Corte feminino com Ana Lima, {rotuloDia} às{" "}
              {hora}. Se precisar mudar ou cancelar, fale com o salão. Até breve!
            </p>
          </div>
        ) : (
          <p className={`mt-5 text-center text-sm lg:hidden ${corDica}`}>
            Escolha um horário e confirme para ver a mensagem que o cliente recebe.
          </p>
        )}
      </div>
    </div>
  );
}

export function IconeMensagem({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5 5.3 15A8 8 0 1 1 9 18.7Z" />
    </svg>
  );
}
