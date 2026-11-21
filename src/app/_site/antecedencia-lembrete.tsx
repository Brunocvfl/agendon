"use client";

// Seção de lembretes: a pessoa escolhe a antecedência (as mesmas opções de /painel/lembretes)
// e vê quando o lembrete sairia. Texto igual ao template aprovado (TEXTOS.lembrete).
import { useState } from "react";
import { IconeMensagem } from "./demo-agendamento";

const OPCOES = [
  { valor: 2, rotulo: "2 h", quando: "2 horas antes", envio: "qua, 11 às 08:30" },
  { valor: 4, rotulo: "4 h", quando: "4 horas antes", envio: "qua, 11 às 06:30" },
  { valor: 12, rotulo: "12 h", quando: "12 horas antes", envio: "ter, 10 às 22:30" },
  { valor: 24, rotulo: "24 h", quando: "24 horas antes", envio: "ter, 10 às 10:30" },
  { valor: 48, rotulo: "48 h", quando: "48 horas antes", envio: "seg, 9 às 10:30" },
  { valor: 0, rotulo: "Desligado", quando: "", envio: "" },
] as const;

export function AntecedenciaLembrete() {
  const [valor, setValor] = useState<number>(24);
  const opcao = OPCOES.find((o) => o.valor === valor)!;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
      <div className="space-y-4">
        <Bolha titulo="Logo depois de marcar">
          Olá, Marina! Seu horário no Studio Bela Vida está confirmado: Corte feminino com Ana Lima, qua, 11 às 10:30. Se
          precisar mudar ou cancelar, fale com o salão. Até breve!
        </Bolha>
        {opcao.valor ? (
          <Bolha key={opcao.valor} titulo={opcao.quando} detalhe={opcao.envio} className="sm:ml-12 motion-safe:animate-chegar">
            Olá, Marina! Passando para lembrar do seu horário no Studio Bela Vida: Corte feminino com Ana Lima, qua, 11 às
            10:30. Se precisar mudar ou cancelar, fale com o salão. Até lá!
          </Bolha>
        ) : (
          <p className="rounded-2xl border-2 border-dashed border-noite/15 p-5 text-sm text-noite/70 sm:ml-12">
            Lembrete desligado: o cliente recebe só a confirmação.
          </p>
        )}
      </div>

      <fieldset>
        <legend className="text-sm font-semibold">Antecedência do lembrete</legend>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3">
          {OPCOES.map((o) => (
            <label
              key={o.valor}
              className="grid h-14 cursor-pointer place-items-center rounded-2xl bg-white text-base font-semibold ring-1 ring-noite/10 transition-colors hover:ring-on/50 has-checked:bg-noite has-checked:text-white has-checked:ring-noite has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-on"
            >
              <input type="radio" name="antecedencia" className="sr-only" checked={valor === o.valor} onChange={() => setValor(o.valor)} />
              {o.rotulo}
            </label>
          ))}
        </div>
        <p className="mt-4 text-sm text-noite/70">Para um horário na quarta, 11, às 10:30. O padrão é 24 horas.</p>
        <p className="mt-3 text-sm text-noite/70">
          No teste grátis, o WhatsApp envia só a confirmação, até 10 mensagens. O lembrete entra nos planos pagos.
        </p>
      </fieldset>
    </div>
  );
}

function Bolha({
  titulo,
  detalhe,
  children,
  className = "",
}: {
  titulo: string;
  detalhe?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <figure className={`max-w-md rounded-3xl rounded-tl-md bg-white p-5 shadow-[0_18px_40px_-20px_rgb(15_27_77/0.35)] ${className}`}>
      <figcaption className="flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-confirmado-escuro">
          <IconeMensagem />
          <span className="first-letter:uppercase">{titulo}</span>
        </span>
        {detalhe && <span className="text-noite/65">{detalhe}</span>}
      </figcaption>
      <p className="mt-2.5 text-[0.95rem] leading-relaxed">{children}</p>
    </figure>
  );
}
