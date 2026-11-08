"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alerta, Botao, Campo } from "@/components/ui";
import { salvarServico, type EstadoServico } from "./actions";

type Inicial = { id?: string; nome?: string; duracao?: string; preco?: string };

export function FormServico({ inicial = {} }: { inicial?: Inicial }) {
  const [estado, acao, pendente] = useActionState<EstadoServico, FormData>(salvarServico, {});
  const valor = (campo: keyof NonNullable<EstadoServico["campos"]>) => estado.campos?.[campo] ?? inicial[campo] ?? "";

  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
      {inicial.id ? <input type="hidden" name="id" value={inicial.id} /> : null}
      <Campo
        id="nome"
        name="nome"
        label="Nome do serviço"
        placeholder="Corte feminino"
        maxLength={60}
        required
        defaultValue={valor("nome")}
        erro={estado.erros?.nome}
        key={`nome-${valor("nome")}`}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          id="duracao"
          name="duracao"
          label="Duração (minutos)"
          type="number"
          inputMode="numeric"
          min={5}
          max={720}
          step={5}
          placeholder="60"
          required
          defaultValue={valor("duracao")}
          erro={estado.erros?.duracao}
          ajuda="Quanto tempo o serviço ocupa na agenda."
          key={`duracao-${valor("duracao")}`}
        />
        <Campo
          id="preco"
          name="preco"
          label="Preço (R$)"
          inputMode="decimal"
          placeholder="90,00"
          required
          defaultValue={valor("preco")}
          erro={estado.erros?.preco}
          key={`preco-${valor("preco")}`}
        />
      </div>
      <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href="/painel/servicos"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-noite/15 bg-white px-5 text-sm font-semibold hover:bg-fundo"
        >
          Cancelar
        </Link>
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar serviço"}
        </Botao>
      </div>
    </form>
  );
}
