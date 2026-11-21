"use client";

import { useActionState, useState } from "react";
import { Alerta, Botao } from "@/components/ui";
import { formatarPreco } from "@/lib/formato";
import {
  DESCONTO_ANUAL,
  LIMITES_DO_PLANO,
  NOME_DO_PLANO,
  PLANOS_PAGOS,
  PRECO_MENSAL,
  precoDoCiclo,
  type Ciclo,
} from "@/lib/regras/plano";
import { comprar, type EstadoForm } from "./actions";

const plural = (n: number, um: string, varios: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;

/** Escolha do período e do plano; cada plano é um botão que abre o pagamento no Mercado Pago. */
export function FormCompra({ atual, agendas }: { atual: string; agendas: number }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(comprar, {});
  const [ciclo, setCiclo] = useState<Ciclo>("mensal");

  return (
    <form action={acao} className="flex flex-col gap-4">
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
      <input type="hidden" name="tipo" value="avulso" />
      <input type="hidden" name="ciclo" value={ciclo} />

      <fieldset className="flex gap-2" disabled={pendente}>
        <legend className="sr-only">Período</legend>
        {(["mensal", "anual"] as const).map((c) => (
          <label
            key={c}
            className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-on ${ciclo === c ? "border-on bg-on text-white" : "border-noite/15 bg-white text-noite"}`}
          >
            <input type="radio" name="periodo" className="sr-only" checked={ciclo === c} onChange={() => setCiclo(c)} />
            {c === "mensal" ? "Mensal" : `Anual (${DESCONTO_ANUAL * 100}% de desconto)`}
          </label>
        ))}
      </fieldset>

      <ul className="grid gap-4 sm:grid-cols-3">
        {PLANOS_PAGOS.map((p) => {
          const limite = LIMITES_DO_PLANO[p];
          const naoCabe = limite.agendas < agendas;
          return (
            <li key={p} className={`flex flex-col rounded-2xl border p-4 ${p === atual ? "border-on" : "border-noite/10"}`}>
              <h3 className="font-semibold">
                {NOME_DO_PLANO[p]} {p === atual ? <span className="text-xs font-normal text-on">(seu plano)</span> : null}
              </h3>
              <p className="mt-2 text-2xl font-semibold">
                {formatarPreco(precoDoCiclo(p, ciclo))}
                <span className="text-sm font-normal text-noite/65">{ciclo === "mensal" ? "/mês" : "/ano"}</span>
              </p>
              {ciclo === "anual" ? (
                <p className="text-xs text-noite/65">em vez de {formatarPreco(PRECO_MENSAL[p] * 12)}</p>
              ) : null}
              <ul className="mt-3 flex-1 text-sm text-noite/75">
                <li>{limite.agendas === 1 ? "1 agenda" : `Até ${limite.agendas} agendas`}</li>
                <li>{plural(limite.mensagens, "mensagem", "mensagens")} de WhatsApp por mês</li>
              </ul>
              {naoCabe ? (
                <p className="mt-3 text-xs text-noite/65">Você tem {plural(agendas, "agenda ativa", "agendas ativas")}.</p>
              ) : null}
              <Botao type="submit" name="plano" value={p} disabled={pendente || naoCabe} className="mt-4">
                {pendente ? "Abrindo…" : p === atual ? "Pagar" : "Escolher"}
              </Botao>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-noite/65">
        Pagamento pelo Mercado Pago: Pix, cartão à vista ou débito. Pagamento adiantado soma ao período que você já tem.
      </p>
    </form>
  );
}

/** Pacote extra de mensagens. */
export function FormPacote({ texto }: { texto: string }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(comprar, {});
  return (
    <form action={acao} className="mt-4 flex flex-col gap-3">
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
      <input type="hidden" name="tipo" value="pacote" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-noite/75">{texto}</p>
        <Botao type="submit" variante="secundario" disabled={pendente}>
          {pendente ? "Abrindo…" : "Comprar pacote"}
        </Botao>
      </div>
    </form>
  );
}
