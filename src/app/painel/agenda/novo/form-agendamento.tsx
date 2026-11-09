"use client";

import { useFocarPrimeiroErro } from "@/components/use-focar-erro";
import { startTransition, useActionState, useEffect, useState, type FormEvent } from "react";
import { Alerta, Botao, BotaoLink, Campo, Selecao } from "@/components/ui";
import { formatarDuracao, formatarPreco } from "@/lib/formato";
import type { OpcoesAgendamento } from "../dados";
import { buscarClientes, criarAgendamento, type ClienteEncontrado, type EstadoForm } from "../actions";
import { EscolhaHorario } from "../escolha-horario";

type Props = {
  opcoes: OpcoesAgendamento;
  inicial: { dia: string; profissional: string; hora: string };
  /** Dono(a) e Recepção buscam também pelo WhatsApp; Profissional, só pelo nome. */
  buscaPorTelefone: boolean;
};

const CAMPO =
  "h-11 w-full rounded-xl border bg-white px-3.5 text-base text-noite outline-none transition-colors focus:border-on focus:ring-2 focus:ring-on/20";

export function FormAgendamento({ opcoes, inicial, buscaPorTelefone }: Props) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(criarAgendamento, {});
  const form = useFocarPrimeiroErro(estado);
  const erros = estado.erros ?? {};

  const servicosDe = (profId: string) => opcoes.profissionais.find((p) => p.id === profId)?.servicos ?? [];
  const [profissional, setProfissional] = useState(inicial.profissional || opcoes.profissionais[0].id);
  const [servico, setServico] = useState(() => servicosDe(inicial.profissional || opcoes.profissionais[0].id)[0] ?? "");
  const [dia, setDia] = useState(inicial.dia);
  const [hora, setHora] = useState(inicial.hora || "09:00");

  const [modoCliente, setModoCliente] = useState<"existente" | "novo">("existente");
  const [cliente, setCliente] = useState<ClienteEncontrado | null>(null);
  const [busca, setBusca] = useState("");
  // Resultado guardado com o termo buscado: resposta atrasada de um termo antigo não aparece.
  const [achados, setAchados] = useState<{ termo: string; lista: ClienteEncontrado[] } | null>(null);
  const termo = busca.trim();
  const temTermo = termo.length >= 2;
  /** null = temTermo. */
  const resultados = !temTermo ? [] : achados?.termo === termo ? achados.lista : null;

  const doProfissional = servicosDe(profissional);
  const servicoAtual = opcoes.servicos.find((s) => s.id === servico);

  // Busca de cliente com pequena espera entre as teclas.
  useEffect(() => {
    if (termo.length < 2) return;
    let ativo = true;
    const t = setTimeout(() => {
      buscarClientes(termo).then((lista) => {
        if (ativo) setAchados({ termo, lista });
      });
    }, 250);
    return () => {
      ativo = false;
      clearTimeout(t);
    };
  }, [termo]);

  const trocarProfissional = (id: string) => {
    setProfissional(id);
    const lista = servicosDe(id);
    if (!lista.includes(servico)) setServico(lista[0] ?? "");
  };

  // Envio sem o reset automático do <form action> (que levaria os <select> controlados à primeira opção).
  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => acao(fd));
  };

  return (
    <form ref={form} onSubmit={enviar} className="flex flex-col gap-5" noValidate>
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Selecao
          id="profissional"
          rotulo="Profissional"
          valor={profissional}
          onChange={trocarProfissional}
          erro={erros.profissional}
          opcoes={opcoes.profissionais.map((p) => ({ valor: p.id, rotulo: p.nome }))}
        />
        <Selecao
          id="servico"
          rotulo="Serviço"
          valor={servico}
          onChange={setServico}
          erro={erros.servico ?? (doProfissional.length === 0 ? "Este profissional não tem serviços cadastrados." : undefined)}
          opcoes={opcoes.servicos
            .filter((s) => doProfissional.includes(s.id))
            .map((s) => ({ valor: s.id, rotulo: `${s.nome} · ${formatarDuracao(s.duracao)}` }))}
        />
      </div>

      <EscolhaHorario
        profissional={profissional}
        servico={servico}
        dia={dia}
        onDia={setDia}
        hora={hora}
        onHora={setHora}
        erros={erros}
        recarregar={estado}
        info={servicoAtual ? `${formatarDuracao(servicoAtual.duracao)} · ${formatarPreco(servicoAtual.preco)}` : null}
      />

      <fieldset className="flex flex-col gap-3 border-t border-noite/8 pt-5">
        <legend className="sr-only">Cliente</legend>
        <input type="hidden" name="modoCliente" value={modoCliente} />
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-noite/80">Cliente</p>
          <button
            type="button"
            onClick={() => setModoCliente(modoCliente === "novo" ? "existente" : "novo")}
            className="text-sm font-medium text-on hover:underline"
          >
            {modoCliente === "novo" ? "Buscar cliente cadastrado" : "+ Cliente novo"}
          </button>
        </div>

        {modoCliente === "novo" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              id="nome"
              name="nome"
              label="Nome"
              autoComplete="off"
              defaultValue={estado.campos?.nome ?? ""}
              erro={erros.nome}
            />
            <Campo
              id="telefone"
              name="telefone"
              label="WhatsApp"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="(11) 98765-4321"
              defaultValue={estado.campos?.telefone ?? ""}
              erro={erros.telefone}
              ajuda="Se o WhatsApp já estiver cadastrado, o agendamento vai para esse cliente."
            />
          </div>
        ) : cliente ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-fundo px-4 py-3">
            <input type="hidden" name="clienteId" value={cliente.id} />
            <div className="min-w-0">
              <p className="truncate font-medium">{cliente.nome}</p>
              <p className="text-sm text-noite/65">{cliente.detalhe}</p>
            </div>
            <button type="button" onClick={() => setCliente(null)} className="text-sm font-medium text-on hover:underline">
              Trocar
            </button>
          </div>
        ) : (
          <div className="relative">
            <label htmlFor="busca-cliente" className="sr-only">
              {buscaPorTelefone ? "Buscar cliente por nome ou WhatsApp" : "Buscar cliente pelo nome"}
            </label>
            <input
              id="busca-cliente"
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={buscaPorTelefone ? "Buscar por nome ou WhatsApp" : "Buscar pelo nome"}
              autoComplete="off"
              aria-invalid={erros.cliente ? true : undefined}
              aria-describedby={erros.cliente ? "busca-cliente-erro" : undefined}
              className={`${CAMPO} ${erros.cliente ? "border-red-400" : "border-noite/15"}`}
            />
            {/* Resumo para o leitor de tela; a lista em si não é anunciada a cada tecla. */}
            <p aria-live="polite" className="sr-only">
              {resultados === null ? "Buscando…" : temTermo ? `${resultados.length} encontrados` : ""}
            </p>
            {resultados === null ? (
              <p className="mt-2 text-sm text-noite/65">Buscando…</p>
            ) : resultados.length > 0 ? (
              <ul className="mt-2 overflow-hidden rounded-xl ring-1 ring-noite/10">
                {resultados.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setCliente(c);
                        setBusca("");
                      }}
                      className="flex w-full items-center justify-between gap-3 border-b border-noite/8 bg-white px-4 py-2.5 text-left last:border-b-0 hover:bg-fundo"
                    >
                      <span className="truncate font-medium">{c.nome}</span>
                      <span className="shrink-0 text-sm tabular-nums text-noite/65">{c.detalhe}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : temTermo ? (
              <p className="mt-2 text-sm text-noite/65">
                Nenhum cliente encontrado.{" "}
                <button type="button" onClick={() => setModoCliente("novo")} className="font-medium text-on hover:underline">
                  Cadastrar cliente novo
                </button>
              </p>
            ) : null}
            {erros.cliente ? <p id="busca-cliente-erro" className="mt-1.5 text-sm text-red-600">{erros.cliente}</p> : null}
          </div>
        )}
      </fieldset>

      <div className="mt-1 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <BotaoLink href={`/painel/agenda?dia=${dia}`} variante="secundario">
          Cancelar
        </BotaoLink>
        <Botao type="submit" disabled={pendente || !servico}>
          {pendente ? "Agendando…" : "Agendar"}
        </Botao>
      </div>
    </form>
  );
}
