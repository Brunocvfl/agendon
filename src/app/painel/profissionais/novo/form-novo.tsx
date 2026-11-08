"use client";

import { useActionState } from "react";
import { Alerta, Botao, BotaoLink, Campo } from "@/components/ui";
import { LIMITES_PROFISSIONAL } from "@/lib/regras/profissional";
import { criarProfissional, type EstadoForm } from "../actions";

export function FormNovoProfissional({ podeSerEu }: { podeSerEu: boolean }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(criarProfissional, {});

  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
      <Campo
        id="nome"
        name="nome"
        label="Nome"
        placeholder="Ana Lima"
        maxLength={LIMITES_PROFISSIONAL.nome.max}
        autoComplete="off"
        required
        erro={estado.erros?.nome}
        ajuda="Como aparece para os clientes na página de agendamento."
      />
      {podeSerEu ? (
        <label className="flex items-start gap-3 rounded-xl border border-noite/10 bg-fundo p-4 text-sm">
          <input type="checkbox" name="sou_eu" className="mt-0.5 size-4 accent-on" />
          <span>
            <span className="font-medium">Sou eu: também atendo clientes</span>
            <span className="block text-noite/60">
              Liga este profissional ao seu login. Útil para quem trabalha sozinho(a).
            </span>
          </span>
        </label>
      ) : null}
      <p className="text-sm text-noite/60">Depois de salvar, você define os serviços, o horário e as folgas.</p>
      <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <BotaoLink href="/painel/profissionais" variante="secundario">
          Cancelar
        </BotaoLink>
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar e continuar"}
        </Botao>
      </div>
    </form>
  );
}
