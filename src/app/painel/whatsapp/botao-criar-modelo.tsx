"use client";

import { useActionState } from "react";
import { Alerta, Botao } from "@/components/ui";
import { criarModeloV3, type EstadoCriacao } from "./actions";

export function BotaoCriarModelo() {
  const [estado, acao, pendente] = useActionState<EstadoCriacao>(criarModeloV3, {});
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
