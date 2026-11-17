"use client";

import { useActionState } from "react";
import { Alerta, Botao } from "@/components/ui";
import { criarModelo, type EstadoCriacao } from "./actions";

export function BotaoCriarModelo() {
  const [estado, acao, pendente] = useActionState<EstadoCriacao>(criarModelo, {});
  return (
    <form action={acao} className="flex flex-col gap-3">
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
      {estado.ok ? <Alerta tipo="sucesso">{estado.ok}</Alerta> : null}
      <div>
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Enviando à Meta…" : "Criar modelo na Meta"}
        </Botao>
      </div>
    </form>
  );
}
