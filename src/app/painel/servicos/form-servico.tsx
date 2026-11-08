"use client";

import { useActionState } from "react";
import { Alerta, Botao, BotaoLink, Campo } from "@/components/ui";
import { LIMITES_SERVICO } from "@/lib/regras/servico";
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
        maxLength={LIMITES_SERVICO.nome.max}
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
          min={LIMITES_SERVICO.duracao.min}
          max={LIMITES_SERVICO.duracao.max}
          step={LIMITES_SERVICO.duracao.passo}
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
        <BotaoLink href="/painel/servicos" variante="secundario">
          Cancelar
        </BotaoLink>
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar serviço"}
        </Botao>
      </div>
    </form>
  );
}
