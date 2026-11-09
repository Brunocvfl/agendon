"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Alerta, Botao, Campo } from "@/components/ui";
import { dataNoFuso, minutosNoFuso, paraHora, rotuloData, somarDias } from "@/lib/datas";
import { formatarDuracao, formatarPreco } from "@/lib/formato";
import { agendar, horariosDoDia, type EstadoAgendamento } from "./actions";
import type { PaginaPublica } from "./dados";
import { Turnstile } from "./turnstile";

const DIAS_POR_VEZ = 14;
const HORIZONTE_DIAS = 60; // espelha horarios_publicos no banco

type Props = { slug: string; pagina: PaginaPublica; hoje: string };

export function AgendarPublico({ slug, pagina, hoje }: Props) {
  const { fuso } = pagina.salao;
  const [estado, acao, enviando] = useActionState<EstadoAgendamento, FormData>(agendar, {});

  const [servico, setServico] = useState<string | null>(null);
  /** null = ainda não escolheu; "" = qualquer profissional. */
  const [profissional, setProfissional] = useState<string | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [inicio, setInicio] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<string[] | null>(null);
  const [carregando, iniciarCarga] = useTransition();
  const [qtdDias, setQtdDias] = useState(DIAS_POR_VEZ);

  const passoProfissional = useRef<HTMLElement>(null);
  const passoDia = useRef<HTMLElement>(null);
  const passoDados = useRef<HTMLElement>(null);

  const quemAtende = servico ? pagina.profissionais.filter((p) => p.servicos.some((s) => s.id === servico)) : [];
  const servicoEscolhido = pagina.servicos.find((s) => s.id === servico);
  const profissionalEscolhido = pagina.profissionais.find((p) => p.id === profissional);

  function carregarHorarios(d: string, s = servico, p = profissional) {
    if (!s || p === null) return;
    setHorarios(null);
    iniciarCarga(async () => setHorarios(await horariosDoDia(slug, s, p || null, d)));
  }

  // O horário escolhido foi ocupado por outra pessoa: recarrega o dia.
  const ocupadoTratado = useRef<EstadoAgendamento | null>(null);
  useEffect(() => {
    if (estado.ocupado && dia && ocupadoTratado.current !== estado) {
      ocupadoTratado.current = estado;
      setInicio(null);
      carregarHorarios(dia);
      passoDia.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  if (estado.confirmacao) {
    const c = estado.confirmacao;
    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm" aria-live="polite">
        <div className="flex size-12 items-center justify-center rounded-full bg-confirmado/15 text-2xl text-confirmado-escuro">
          ✓
        </div>
        <h2 className="mt-4 text-xl font-semibold">Agendamento feito!</h2>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-noite/65">Serviço</dt>
          <dd className="font-medium">{c.servico}</dd>
          <dt className="text-noite/65">Profissional</dt>
          <dd className="font-medium">{c.profissional}</dd>
          <dt className="text-noite/65">Quando</dt>
          <dd className="font-medium">
            <span className="capitalize">{rotuloData(dataNoFuso(c.inicio, fuso))}</span>, às{" "}
            {paraHora(minutosNoFuso(c.inicio, fuso))}
          </dd>
          <dt className="text-noite/65">Valor</dt>
          <dd className="font-medium">{formatarPreco(c.preco)}</dd>
        </dl>
        <p className="mt-5 text-sm text-noite/70">
          Se precisar cancelar ou remarcar, fale com o {pagina.salao.nome}.
        </p>
        <Botao type="button" variante="secundario" className="mt-6 w-full" onClick={() => window.location.reload()}>
          Fazer outro agendamento
        </Botao>
      </section>
    );
  }

  const dias = Array.from({ length: qtdDias }, (_, i) => somarDias(hoje, i));

  return (
    <div className="flex flex-col gap-4">
      <Passo numero={1} titulo="Escolha o serviço">
        <ul className="flex flex-col gap-2">
          {pagina.servicos.map((s) => (
            <li key={s.id}>
              <Opcao
                selecionada={servico === s.id}
                onClick={() => {
                  setServico(s.id);
                  setProfissional(null);
                  setDia(null);
                  setInicio(null);
                  setTimeout(() => passoProfissional.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
                }}
              >
                <span className="font-medium">{s.nome}</span>
                <span className="text-sm text-noite/65">
                  {formatarDuracao(s.duracao_min)} · {faixaDePreco(pagina, s.id, s.preco)}
                </span>
              </Opcao>
            </li>
          ))}
        </ul>
      </Passo>

      {servico ? (
        <Passo numero={2} titulo="Com quem?" ref={passoProfissional}>
          <ul className="flex flex-col gap-2">
            {quemAtende.length > 1 ? (
              <li>
                <Opcao
                  selecionada={profissional === ""}
                  onClick={() => escolherProfissional("")}
                >
                  <span className="font-medium">Qualquer profissional</span>
                  <span className="text-sm text-noite/65">Mostra mais horários</span>
                </Opcao>
              </li>
            ) : null}
            {quemAtende.map((p) => {
              const s = p.servicos.find((x) => x.id === servico)!;
              return (
                <li key={p.id}>
                  <Opcao selecionada={profissional === p.id} onClick={() => escolherProfissional(p.id)}>
                    <span className="font-medium">{p.nome}</span>
                    <span className="text-sm text-noite/65">
                      {formatarDuracao(s.duracao_min)} · {formatarPreco(s.preco)}
                    </span>
                  </Opcao>
                </li>
              );
            })}
          </ul>
        </Passo>
      ) : null}

      {servico && profissional !== null ? (
        <Passo numero={3} titulo="Dia e horário" ref={passoDia}>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="group" aria-label="Dias">
            {dias.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={dia === d}
                onClick={() => {
                  setDia(d);
                  setInicio(null);
                  carregarHorarios(d);
                }}
                className={`flex shrink-0 flex-col items-center rounded-xl border px-3 py-2 text-sm capitalize transition-colors ${
                  dia === d ? "border-on bg-on text-white" : "border-noite/15 bg-white hover:border-on"
                }`}
              >
                <span className="text-xs opacity-75">{d === hoje ? "hoje" : rotuloData(d).split(",")[0]}</span>
                <span className="font-semibold">{rotuloData(d).split(", ")[1]}</span>
              </button>
            ))}
            {qtdDias <= HORIZONTE_DIAS ? (
              <button
                type="button"
                onClick={() => setQtdDias((q) => Math.min(q + DIAS_POR_VEZ, HORIZONTE_DIAS + 1))}
                className="shrink-0 rounded-xl border border-dashed border-noite/25 px-3 text-sm text-noite/70 hover:border-on"
              >
                Mais dias
              </button>
            ) : null}
          </div>

          {/* O horário foi ocupado por outra pessoa: o passo 4 some, então o aviso fica aqui. */}
          {estado.ocupado && estado.erro && !inicio ? (
            <div className="mt-3">
              <Alerta tipo="erro">{estado.erro}</Alerta>
            </div>
          ) : null}

          {dia ? (
            <div className="mt-3" aria-live="polite">
              {carregando || horarios === null ? (
                <p className="text-sm text-noite/65">Buscando horários…</p>
              ) : horarios.length === 0 ? (
                <p className="text-sm text-noite/65">Sem horários livres neste dia. Tente outro.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {horarios.map((h) => (
                    <button
                      key={h}
                      type="button"
                      aria-pressed={inicio === h}
                      onClick={() => {
                        setInicio(h);
                        setTimeout(() => passoDados.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
                      }}
                      className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
                        inicio === h ? "border-on bg-on text-white" : "border-noite/15 bg-white hover:border-on"
                      }`}
                    >
                      {paraHora(minutosNoFuso(h, fuso))}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm text-noite/65">Escolha um dia para ver os horários.</p>
          )}
        </Passo>
      ) : null}

      {servico && profissional !== null && dia && inicio ? (
        <Passo numero={4} titulo="Seus dados" ref={passoDados}>
          <p className="mb-4 rounded-xl bg-fundo px-4 py-3 text-sm">
            <strong>{servicoEscolhido?.nome}</strong> com {profissionalEscolhido?.nome ?? "qualquer profissional"},{" "}
            <span className="capitalize">{rotuloData(dia)}</span> às {paraHora(minutosNoFuso(inicio, fuso))}
          </p>
          <form action={acao} className="flex flex-col gap-4" noValidate>
            {estado.erro && !estado.ocupado ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="servico" value={servico} />
            <input type="hidden" name="profissional" value={profissional} />
            <input type="hidden" name="dia" value={dia} />
            <input type="hidden" name="hora" value={paraHora(minutosNoFuso(inicio, fuso))} />
            <Campo
              id="nome"
              name="nome"
              label="Seu nome"
              autoComplete="name"
              required
              maxLength={80}
              defaultValue={estado.campos?.nome}
              erro={estado.erros?.nome}
            />
            <Campo
              id="telefone"
              name="telefone"
              type="tel"
              label="WhatsApp"
              autoComplete="tel"
              inputMode="tel"
              placeholder="(11) 98765-4321"
              required
              defaultValue={estado.campos?.telefone}
              erro={estado.erros?.telefone}
            />
            <label className="flex items-start gap-3 text-sm text-noite/75">
              <input type="checkbox" name="optin" value="sim" className="mt-0.5 size-5 shrink-0 accent-on" />
              <span>
                Quero receber a confirmação e o lembrete deste horário pelo WhatsApp, enviados em nome do{" "}
                {pagina.salao.nome}.
              </span>
            </label>
            <Turnstile key={JSON.stringify(estado)} />
            <Botao type="submit" disabled={enviando} className="w-full">
              {enviando ? "Agendando…" : "Confirmar agendamento"}
            </Botao>
            <p className="text-xs text-noite/65">
              Seus dados são usados pelo {pagina.salao.nome} para cuidar do seu agendamento. Saiba mais na{" "}
              <Link href="/privacidade" target="_blank" className="underline">
                Política de Privacidade
              </Link>
              .
            </p>
          </form>
        </Passo>
      ) : null}
    </div>
  );

  function escolherProfissional(id: string) {
    setProfissional(id);
    setInicio(null);
    if (dia) carregarHorarios(dia, servico, id);
    setTimeout(() => passoDia.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
}

function faixaDePreco(pagina: PaginaPublica, servico: string, base: number) {
  const precos = pagina.profissionais.flatMap((p) => p.servicos.filter((s) => s.id === servico).map((s) => s.preco));
  if (precos.length === 0) return formatarPreco(base);
  const min = Math.min(...precos);
  const max = Math.max(...precos);
  return min === max ? formatarPreco(min) : `${formatarPreco(min)} a ${formatarPreco(max)}`;
}

function Passo({
  numero,
  titulo,
  ref,
  children,
}: {
  numero: number;
  titulo: string;
  ref?: React.Ref<HTMLElement>;
  children: React.ReactNode;
}) {
  return (
    <section ref={ref} className="scroll-mt-4 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2.5 font-semibold">
        <span className="flex size-6 items-center justify-center rounded-full bg-on/10 text-xs text-on">{numero}</span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Opcao({
  selecionada,
  onClick,
  children,
}: {
  selecionada: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selecionada}
      onClick={onClick}
      className={`flex w-full flex-col items-start rounded-xl border px-4 py-3 text-left transition-colors ${
        selecionada ? "border-on bg-on/5 ring-1 ring-on" : "border-noite/15 hover:border-on"
      }`}
    >
      {children}
    </button>
  );
}
