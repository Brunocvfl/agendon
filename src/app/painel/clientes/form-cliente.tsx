"use client";

import { useFocarPrimeiroErro } from "@/components/use-focar-erro";
import { useActionState } from "react";
import { Alerta, Botao, BotaoLink, Campo } from "@/components/ui";
import { LIMITES_CLIENTE } from "@/lib/regras/cliente";
import { criarCliente, salvarCliente, type EstadoForm } from "./actions";

type Inicial = { id?: string; nome?: string; telefone?: string; observacoes?: string };

export function FormCliente({ inicial = {} }: { inicial?: Inicial }) {
  const editando = Boolean(inicial.id);
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(editando ? salvarCliente : criarCliente, {});
  const form = useFocarPrimeiroErro(estado);
  // Depois de um erro, mostra o que foi digitado; senão, o valor salvo.
  const valor = (campo: "nome" | "telefone" | "observacoes") => estado.campos?.[campo] ?? inicial[campo] ?? "";
  const erroObs = estado.erros?.observacoes;

  return (
    <form ref={form} action={acao} className="flex flex-col gap-4" noValidate>
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
      {estado.ok ? <Alerta tipo="sucesso">{estado.ok}</Alerta> : null}
      {editando ? <input type="hidden" name="id" value={inicial.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          id="nome"
          name="nome"
          label="Nome"
          placeholder="Marina Prado"
          autoComplete="off"
          maxLength={LIMITES_CLIENTE.nome.max}
          required
          defaultValue={valor("nome")}
          erro={estado.erros?.nome}
          key={`nome-${valor("nome")}`}
        />
        <Campo
          id="telefone"
          name="telefone"
          label="WhatsApp"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="(11) 98765-4321"
          required
          defaultValue={valor("telefone")}
          erro={estado.erros?.telefone}
          ajuda="Com DDD. Número de outro país: comece com + e o código do país."
          key={`telefone-${valor("telefone")}`}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="observacoes" className="text-sm font-medium text-noite/80">
          Observações (opcional)
        </label>
        <textarea
          id="observacoes"
          name="observacoes"
          rows={3}
          maxLength={LIMITES_CLIENTE.observacoes.max}
          placeholder="Preferências de atendimento, melhor horário…"
          defaultValue={valor("observacoes")}
          key={`obs-${valor("observacoes")}`}
          aria-invalid={erroObs ? true : undefined}
          aria-describedby="observacoes-ajuda"
          className={`rounded-xl border bg-white px-3.5 py-2.5 text-base text-noite outline-none transition-colors placeholder:text-noite/35 focus:border-on focus:ring-2 focus:ring-on/20 ${erroObs ? "border-red-400" : "border-noite/15"}`}
        />
        <p id="observacoes-ajuda" className={`text-sm ${erroObs ? "text-red-600" : "text-noite/65"}`}>
          {erroObs ?? "Não registre dados de saúde, documentos ou outros dados sensíveis."}
        </p>
      </div>
      <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {editando ? null : (
          <BotaoLink href="/painel/clientes" variante="secundario">
            Cancelar
          </BotaoLink>
        )}
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : editando ? "Salvar dados" : "Cadastrar cliente"}
        </Botao>
      </div>
    </form>
  );
}
