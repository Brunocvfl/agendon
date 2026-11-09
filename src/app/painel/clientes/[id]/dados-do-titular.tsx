"use client";

import { useActionState, useState } from "react";
import { Alerta, Botao } from "@/components/ui";
import { anonimizarCliente, type EstadoForm } from "../actions";

/** LGPD (só Dono(a)): baixar os dados do cliente e eliminar por anonimização. */
export function DadosDoTitular({ id, futuros }: { id: string; futuros: number }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(anonimizarCliente, {});
  const [confirmando, setConfirmando] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <a
          href={`/painel/clientes/${id}/exportar`}
          download
          className="inline-flex h-11 items-center justify-center rounded-xl border border-noite/15 bg-white px-5 text-[15px] font-semibold text-noite transition-colors hover:bg-noite/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on"
        >
          Baixar dados (JSON)
        </a>
        <p className="mt-2 text-sm text-noite/65">
          Cadastro, autorização do WhatsApp e histórico, para atender a um pedido de acesso ou portabilidade.
        </p>
      </div>

      <form action={acao} className="flex flex-col gap-3 border-t border-noite/8 pt-4">
        {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
        <input type="hidden" name="id" value={id} />
        {confirmando ? (
          <div role="alertdialog" aria-label="Anonimizar cliente" className="flex flex-col gap-3 rounded-xl bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">
              Anonimizar este cliente? Nome, WhatsApp, observações e autorização são apagados e não dá para desfazer.
              {futuros > 0
                ? ` ${futuros === 1 ? "O agendamento futuro será cancelado" : `Os ${futuros} agendamentos futuros serão cancelados`}.`
                : ""}{" "}
              Os atendimentos passados continuam, sem identificação.
            </p>
            <div className="flex flex-wrap gap-3">
              <Botao type="submit" variante="perigo" disabled={pendente} autoFocus>
                {pendente ? "Anonimizando…" : "Sim, anonimizar"}
              </Botao>
              <Botao type="button" variante="secundario" disabled={pendente} onClick={() => setConfirmando(false)}>
                Voltar
              </Botao>
            </div>
          </div>
        ) : (
          <>
            <Botao type="button" variante="secundario" className="text-red-700 sm:self-start" onClick={() => setConfirmando(true)}>
              Anonimizar cliente
            </Botao>
            <p className="text-sm text-noite/65">
              Para um pedido de eliminação. Clientes sem agendamento há 24 meses são anonimizados automaticamente.
            </p>
          </>
        )}
      </form>
    </div>
  );
}
