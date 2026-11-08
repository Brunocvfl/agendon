"use client";

import { startTransition, useActionState, useEffect, useState, type FormEvent } from "react";
import { SeletorHora } from "@/components/seletor-hora";
import { Alerta, Botao, BotaoLink, Campo } from "@/components/ui";
import { formatarDuracao, formatarPreco } from "@/lib/formato";
import { rotuloData } from "@/lib/datas";
import type { OpcoesAgendamento } from "../dados";
import { buscarClientes, criarAgendamento, horariosLivres, type ClienteEncontrado, type EstadoForm } from "../actions";

type Props = { opcoes: OpcoesAgendamento; inicial: { dia: string; profissional: string; hora: string } };

const CAMPO =
  "h-11 w-full rounded-xl border bg-white px-3.5 text-base text-noite outline-none transition-colors focus:border-on focus:ring-2 focus:ring-on/20";

export function FormAgendamento({ opcoes, inicial }: Props) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(criarAgendamento, {});
  const erros = estado.erros ?? {};

  const servicosDe = (profId: string) => opcoes.profissionais.find((p) => p.id === profId)?.servicos ?? [];
  const [profissional, setProfissional] = useState(inicial.profissional || opcoes.profissionais[0].id);
  const [servico, setServico] = useState(() => servicosDe(inicial.profissional || opcoes.profissionais[0].id)[0] ?? "");
  const [dia, setDia] = useState(inicial.dia);
  const [hora, setHora] = useState(inicial.hora || "09:00");
  const [encaixe, setEncaixe] = useState(false);

  const [modoCliente, setModoCliente] = useState<"existente" | "novo">("existente");
  const [cliente, setCliente] = useState<ClienteEncontrado | null>(null);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<ClienteEncontrado[]>([]);
  const [livres, setLivres] = useState<string[] | null>(null);

  const doProfissional = servicosDe(profissional);
  const servicoAtual = opcoes.servicos.find((s) => s.id === servico);

  // Horários livres: recarrega ao trocar profissional, serviço ou dia, e depois de cada resposta (ex.: conflito).
  useEffect(() => {
    let ativo = true;
    if (!servico) return;
    horariosLivres(profissional, servico, dia).then((h) => {
      if (ativo) setLivres(h);
    });
    return () => {
      ativo = false;
    };
  }, [profissional, servico, dia, estado]);

  // Busca de cliente com pequena espera entre as teclas.
  useEffect(() => {
    if (busca.trim().length < 2) return;
    const t = setTimeout(() => {
      buscarClientes(busca).then(setResultados);
    }, 250);
    return () => clearTimeout(t);
  }, [busca]);

  const trocarProfissional = (id: string) => {
    setProfissional(id);
    const lista = servicosDe(id);
    if (!lista.includes(servico)) setServico(lista[0] ?? "");
    setLivres(null);
  };

  // Envio sem o reset automático do <form action> (que levaria os <select> controlados à primeira opção).
  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => acao(fd));
  };

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5" noValidate>
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
          onChange={(v) => {
            setServico(v);
            setLivres(null);
          }}
          erro={erros.servico ?? (doProfissional.length === 0 ? "Este profissional não tem serviços cadastrados." : undefined)}
          opcoes={opcoes.servicos
            .filter((s) => doProfissional.includes(s.id))
            .map((s) => ({ valor: s.id, rotulo: `${s.nome} · ${formatarDuracao(s.duracao)}` }))}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dia" className="text-sm font-medium text-noite/80">
              Dia
            </label>
            <input
              id="dia"
              name="dia"
              type="date"
              value={dia}
              onChange={(e) => {
                setDia(e.target.value);
                setLivres(null);
              }}
              className={`${CAMPO} w-auto ${erros.dia ? "border-red-400" : "border-noite/15"}`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-noite/80">Horário</span>
            <SeletorHora name="hora" rotulo="Horário" valor={hora} onChange={setHora} />
          </div>
          {servicoAtual ? (
            <p className="pb-2.5 text-sm text-noite/55">
              {formatarDuracao(servicoAtual.duracao)} · {formatarPreco(servicoAtual.preco)}
            </p>
          ) : null}
        </div>
        {erros.dia || erros.hora ? (
          <p role="alert" className="text-sm text-red-600">
            {erros.hora ?? erros.dia}
          </p>
        ) : null}

        <div>
          <p className="text-sm text-noite/60">
            Livres em {dia ? rotuloData(dia) : "—"}
            {livres === null ? "…" : livres.length === 0 ? ": nenhum horário livre neste dia." : ":"}
          </p>
          {livres && livres.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {livres.slice(0, 16).map((h) => (
                <li key={h}>
                  <button
                    type="button"
                    onClick={() => setHora(h)}
                    aria-pressed={hora === h}
                    className={`h-9 rounded-lg px-3 text-sm font-medium tabular-nums transition-colors ${
                      hora === h ? "bg-on text-white" : "bg-on/10 text-on hover:bg-on/15"
                    }`}
                  >
                    {h}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {erros.encaixe || encaixe ? (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {erros.encaixe ? <p className="font-medium">{erros.encaixe}</p> : null}
            <label className="mt-1 flex items-center gap-2">
              <input
                type="checkbox"
                name="encaixe"
                checked={encaixe}
                onChange={(e) => setEncaixe(e.target.checked)}
                className="size-4 accent-on"
              />
              Agendar mesmo assim (encaixe)
            </label>
          </div>
        ) : null}
      </div>

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
              <p className="text-sm text-noite/60">{cliente.telefone}</p>
            </div>
            <button type="button" onClick={() => setCliente(null)} className="text-sm font-medium text-on hover:underline">
              Trocar
            </button>
          </div>
        ) : (
          <div className="relative">
            <label htmlFor="busca-cliente" className="sr-only">
              Buscar cliente por nome ou WhatsApp
            </label>
            <input
              id="busca-cliente"
              type="search"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                if (e.target.value.trim().length < 2) setResultados([]);
              }}
              placeholder="Buscar por nome ou WhatsApp"
              autoComplete="off"
              aria-invalid={erros.cliente ? true : undefined}
              className={`${CAMPO} ${erros.cliente ? "border-red-400" : "border-noite/15"}`}
            />
            {resultados.length > 0 ? (
              <ul className="mt-2 overflow-hidden rounded-xl ring-1 ring-noite/10">
                {resultados.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setCliente(c);
                        setBusca("");
                        setResultados([]);
                      }}
                      className="flex w-full items-center justify-between gap-3 border-b border-noite/8 bg-white px-4 py-2.5 text-left last:border-b-0 hover:bg-fundo"
                    >
                      <span className="truncate font-medium">{c.nome}</span>
                      <span className="shrink-0 text-sm tabular-nums text-noite/60">{c.telefone}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : busca.trim().length >= 2 ? (
              <p className="mt-2 text-sm text-noite/55">
                Nenhum cliente encontrado.{" "}
                <button type="button" onClick={() => setModoCliente("novo")} className="font-medium text-on hover:underline">
                  Cadastrar cliente novo
                </button>
              </p>
            ) : null}
            {erros.cliente ? <p className="mt-1.5 text-sm text-red-600">{erros.cliente}</p> : null}
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

function Selecao({
  id,
  rotulo,
  valor,
  onChange,
  opcoes,
  erro,
}: {
  id: string;
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  opcoes: { valor: string; rotulo: string }[];
  erro?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-noite/80">
        {rotulo}
      </label>
      <select
        id={id}
        name={id}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={erro ? true : undefined}
        className={`${CAMPO} cursor-pointer ${erro ? "border-red-400" : "border-noite/15"}`}
      >
        {opcoes.length === 0 ? <option value="">—</option> : null}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      {erro ? <p className="text-sm text-red-600">{erro}</p> : null}
    </div>
  );
}
