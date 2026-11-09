"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { Alerta, Botao, BotaoLink, Campo, Selecao } from "@/components/ui";
import { useFocarPrimeiroErro } from "@/components/use-focar-erro";
import { AGENDA_NOVA, LIMITES_EQUIPE, PERFIS } from "@/lib/regras/equipe";
import { NOME_PERFIL, type Perfil } from "@/lib/permissoes";
import { convidar, salvarMembro, type EstadoForm } from "./actions";

const AJUDA_PERFIL: Record<Perfil, string> = {
  dono: "Acesso total, inclusive serviços, preços e equipe.",
  recepcao: "Vê a agenda de todos e os clientes; agenda, remarca e edita horários e folgas.",
  profissional: "Vê só a própria agenda (sem o telefone dos clientes) e agenda nela.",
};

type Inicial = { id: string; nome: string; perfil: Perfil; agenda: string; eu: boolean };

/** Convidar (sem `inicial`) ou editar quem já está na equipe. */
export function FormMembro({ agendas, inicial }: { agendas: { id: string; nome: string }[]; inicial?: Inicial }) {
  const editando = Boolean(inicial);
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(editando ? salvarMembro : convidar, {});
  const form = useFocarPrimeiroErro(estado);
  const [perfil, setPerfil] = useState<string>(estado.campos?.perfil ?? inicial?.perfil ?? "recepcao");
  const [agenda, setAgenda] = useState<string>(estado.campos?.agenda ?? inicial?.agenda ?? "");
  const valor = (campo: "nome" | "email") => estado.campos?.[campo] ?? (campo === "nome" ? inicial?.nome : "") ?? "";

  // Envio sem o reset automático do <form action> (que levaria os <select> controlados à primeira opção).
  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => acao(fd));
  };

  const opcoesAgenda = [
    { valor: "", rotulo: perfil === "profissional" ? "Escolha a agenda…" : "Sem agenda" },
    ...agendas.map((a) => ({ valor: a.id, rotulo: a.nome })),
    { valor: AGENDA_NOVA, rotulo: "Criar agenda nova com o nome da pessoa" },
  ];

  return (
    <form ref={form} onSubmit={enviar} className="flex flex-col gap-4" noValidate>
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
      {inicial ? <input type="hidden" name="id" value={inicial.id} /> : null}
      <Campo
        id="nome"
        name="nome"
        label="Nome"
        placeholder="Marcela Costa"
        autoComplete="off"
        maxLength={LIMITES_EQUIPE.nome.max}
        required
        defaultValue={valor("nome")}
        erro={estado.erros?.nome}
        key={`nome-${valor("nome")}`}
      />
      {editando ? null : (
        <Campo
          id="email"
          name="email"
          type="email"
          label="E-mail"
          placeholder="marcela@email.com"
          autoComplete="off"
          inputMode="email"
          maxLength={LIMITES_EQUIPE.email.max}
          required
          defaultValue={valor("email")}
          erro={estado.erros?.email}
          ajuda="A pessoa recebe um e-mail para criar a senha. O link vale por 1 hora; dá para reenviar."
          key={`email-${valor("email")}`}
        />
      )}

      {inicial?.eu ? (
        <div className="flex flex-col gap-1.5">
          <input type="hidden" name="perfil" value={inicial.perfil} />
          <p className="text-sm font-medium text-noite/80">Perfil</p>
          <p className="text-base">{NOME_PERFIL[inicial.perfil]}</p>
          <p className="text-sm text-noite/65">Você não pode mudar o seu próprio perfil.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Selecao
            id="perfil"
            rotulo="Perfil"
            valor={perfil}
            onChange={setPerfil}
            opcoes={PERFIS.map((p) => ({ valor: p, rotulo: NOME_PERFIL[p] }))}
            erro={estado.erros?.perfil}
          />
          <p className="text-sm text-noite/65">{AJUDA_PERFIL[perfil as Perfil] ?? ""}</p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Selecao id="agenda" rotulo="Agenda" valor={agenda} onChange={setAgenda} opcoes={opcoesAgenda} erro={estado.erros?.agenda} />
        <p className="text-sm text-noite/65">
          {perfil === "profissional"
            ? "A agenda em que essa pessoa atende. Ela só vê e mexe nessa agenda."
            : "Se essa pessoa também atende clientes, ligue a agenda dela (opcional)."}
        </p>
      </div>

      <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <BotaoLink href="/painel/configuracoes/equipe" variante="secundario">
          Cancelar
        </BotaoLink>
        <Botao type="submit" disabled={pendente}>
          {pendente ? (editando ? "Salvando…" : "Enviando convite…") : editando ? "Salvar" : "Enviar convite"}
        </Botao>
      </div>
    </form>
  );
}
