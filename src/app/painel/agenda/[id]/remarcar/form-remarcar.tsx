"use client";

import { useFocarPrimeiroErro } from "@/components/use-focar-erro";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { Alerta, Botao, BotaoLink, Selecao } from "@/components/ui";
import { remarcarAgendamento, type EstadoForm } from "../../actions";
import { EscolhaHorario } from "../../escolha-horario";

type Props = {
  id: string;
  servico: string;
  profissionais: { id: string; nome: string }[];
  inicial: { profissional: string; dia: string; hora: string };
};

export function FormRemarcar({ id, servico, profissionais, inicial }: Props) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(remarcarAgendamento, {});
  const form = useFocarPrimeiroErro(estado);
  const erros = estado.erros ?? {};
  const [profissional, setProfissional] = useState(inicial.profissional);
  const [dia, setDia] = useState(inicial.dia);
  const [hora, setHora] = useState(inicial.hora);

  // Envio sem o reset automático do <form action> (que levaria o <select> controlado à primeira opção).
  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => acao(fd));
  };

  return (
    <form ref={form} onSubmit={enviar} className="flex flex-col gap-5" noValidate>
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
      <input type="hidden" name="id" value={id} />

      {profissionais.length > 1 ? (
        <Selecao
          id="profissional"
          rotulo="Profissional"
          valor={profissional}
          onChange={setProfissional}
          erro={erros.profissional}
          opcoes={profissionais.map((p) => ({ valor: p.id, rotulo: p.nome }))}
        />
      ) : (
        <input type="hidden" name="profissional" value={profissional} />
      )}

      <EscolhaHorario
        profissional={profissional}
        servico={servico}
        ignorar={id}
        dia={dia}
        onDia={setDia}
        hora={hora}
        onHora={setHora}
        erros={erros}
        recarregar={estado}
      />

      <p className="text-sm text-noite/65">
        Serviço, cliente e preço continuam os mesmos. Depois de remarcar, o status volta para agendado.
        {profissional !== inicial.profissional ? " Com outro profissional, vale a duração do serviço para ele." : ""}
      </p>

      <div className="mt-1 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <BotaoLink href={`/painel/agenda/${id}`} variante="secundario">
          Voltar
        </BotaoLink>
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Remarcando…" : "Remarcar"}
        </Botao>
      </div>
    </form>
  );
}
