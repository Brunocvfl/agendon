"use client";

import { useFocarPrimeiroErro } from "@/components/use-focar-erro";
import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { Alerta, Botao, Campo } from "@/components/ui";
import { dataNoFuso, horaNoFuso, partesDaData, rotuloData, somarDias } from "@/lib/datas";
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
  const form = useFocarPrimeiroErro(estado);

  const [servico, setServico] = useState<string | null>(null);
  /** null = ainda não escolheu; "" = qualquer profissional. */
  const [profissional, setProfissional] = useState<string | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [inicio, setInicio] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<string[] | null>(null);
  const [carregando, iniciarCarga] = useTransition();
  const [qtdDias, setQtdDias] = useState(DIAS_POR_VEZ);
  /** Passo já respondido que a pessoa abriu de novo para trocar (os outros respondidos ficam recolhidos). */
  const [reaberto, setReaberto] = useState<number | null>(null);
  const alternar = (n: number) => setReaberto((atual) => (atual === n ? null : n));

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
      setReaberto(null);
      carregarHorarios(dia);
      rolarAte(passoDia.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  // Confirmação: o foco vai para o título, e o leitor de tela lê o resultado (aria-live não anuncia
  // conteúdo que acabou de ser montado).
  const tituloConfirmacao = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (estado.confirmacao) tituloConfirmacao.current?.focus();
  }, [estado.confirmacao]);

  if (estado.confirmacao) {
    const c = estado.confirmacao;
    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div aria-hidden className="flex size-12 items-center justify-center rounded-full bg-confirmado/15 text-2xl text-confirmado-escuro">
          ✓
        </div>
        <h2 ref={tituloConfirmacao} tabIndex={-1} className="mt-4 text-xl font-semibold outline-none">
          Agendamento feito!
        </h2>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-noite/65">Serviço</dt>
          <dd className="font-medium">{c.servico}</dd>
          <dt className="text-noite/65">Profissional</dt>
          <dd className="font-medium">{c.profissional}</dd>
          <dt className="text-noite/65">Quando</dt>
          <dd className="font-medium">
            <span className="capitalize">{rotuloData(dataNoFuso(c.inicio, fuso))}</span>, às{" "}
            {horaNoFuso(c.inicio, fuso)}
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
      <Passo
        numero={1}
        titulo="Escolher serviço"
        resumo={servicoEscolhido?.nome}
        aberto={!servico || reaberto === 1}
        onAlternar={() => alternar(1)}
      >
        <ul className="flex flex-col gap-2">
          {pagina.servicos.map((s) => (
            <li key={s.id}>
              <Opcao
                selecionada={servico === s.id}
                onClick={() => {
                  setReaberto(null);
                  if (s.id === servico) return;
                  setServico(s.id);
                  setProfissional(null);
                  setDia(null);
                  setInicio(null);
                  setTimeout(() => rolarAte(passoProfissional.current));
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
        <Passo
          numero={2}
          titulo="Escolher profissional"
          ref={passoProfissional}
          resumo={profissional === null ? undefined : (profissionalEscolhido?.nome ?? "Qualquer profissional")}
          aberto={profissional === null || reaberto === 2}
          onAlternar={() => alternar(2)}
        >
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
        <Passo
          numero={3}
          titulo="Dia e horário"
          ref={passoDia}
          resumo={
            dia && inicio ? (
              <>
                <span className="capitalize">{rotuloData(dia)}</span> às {horaNoFuso(inicio, fuso)}
              </>
            ) : undefined
          }
          aberto={!(dia && inicio) || reaberto === 3}
          onAlternar={() => alternar(3)}
        >
          <div className="-mx-1 flex snap-x gap-2 overflow-x-auto overscroll-x-contain px-1 pb-2" role="group" aria-label="Dias">
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
                className={`flex shrink-0 snap-start flex-col items-center rounded-xl border px-3 py-2 text-sm capitalize transition-colors ${
                  dia === d ? "border-on bg-on text-white" : "border-noite/15 bg-white hover:border-on"
                }`}
              >
                <span className="text-xs opacity-75">{d === hoje ? "hoje" : partesDaData(d).semana}</span>
                <span className="font-semibold">{partesDaData(d).dia}</span>
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
                        setReaberto(null);
                        setTimeout(() => rolarAte(passoDados.current));
                      }}
                      className={`h-11 rounded-xl border text-sm font-medium tabular-nums transition-colors ${
                        inicio === h ? "border-on bg-on text-white" : "border-noite/15 bg-white hover:border-on"
                      }`}
                    >
                      {horaNoFuso(h, fuso)}
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
          <form ref={form} action={acao} className="flex flex-col gap-4" noValidate>
            {estado.erro && !estado.ocupado ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="servico" value={servico} />
            <input type="hidden" name="profissional" value={profissional} />
            <input type="hidden" name="dia" value={dia} />
            <input type="hidden" name="hora" value={horaNoFuso(inicio, fuso)} />
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
    setReaberto(null);
    if (id === profissional) return;
    setProfissional(id);
    setInicio(null);
    if (dia) carregarHorarios(dia, servico, id);
    setTimeout(() => rolarAte(passoDia.current));
  }
}

// Rola até o próximo passo; sem animação para quem pediu menos movimento no sistema.
function rolarAte(el: HTMLElement | null) {
  const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el?.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" });
}

function faixaDePreco(pagina: PaginaPublica, servico: string, base: number) {
  const precos = pagina.profissionais.flatMap((p) => p.servicos.filter((s) => s.id === servico).map((s) => s.preco));
  if (precos.length === 0) return formatarPreco(base);
  const min = Math.min(...precos);
  const max = Math.max(...precos);
  return min === max ? formatarPreco(min) : `${formatarPreco(min)} a ${formatarPreco(max)}`;
}

/**
 * Um passo do agendamento. Depois de respondido (`resumo`), fica recolhido mostrando a escolha, com
 * "Alterar" para abrir de novo (padrão de divulgação: o botão fica no título, com `aria-expanded`).
 */
function Passo({
  numero,
  titulo,
  resumo,
  aberto = true,
  onAlternar,
  ref,
  children,
}: {
  numero: number;
  titulo: string;
  resumo?: React.ReactNode;
  aberto?: boolean;
  onAlternar?: () => void;
  ref?: React.Ref<HTMLElement>;
  children: React.ReactNode;
}) {
  const conteudo = useId();
  const respondido = resumo !== undefined && onAlternar;
  const marcador = (
    <span
      aria-hidden
      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${
        respondido ? "bg-confirmado/15 text-confirmado-escuro" : "bg-on/10 text-on"
      }`}
    >
      {respondido ? "✓" : numero}
    </span>
  );

  return (
    <section ref={ref} className="scroll-mt-4 rounded-2xl bg-white p-5 shadow-sm">
      {respondido ? (
        <h2 className={aberto ? "mb-4" : undefined}>
          <button
            type="button"
            aria-expanded={aberto}
            aria-controls={conteudo}
            onClick={onAlternar}
            className="-m-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-xl p-2 text-left hover:bg-fundo"
          >
            {marcador}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-semibold">{titulo}</span>
              {!aberto ? <span className="truncate text-sm font-normal text-noite/70">{resumo}</span> : null}
            </span>
            <span className="shrink-0 text-sm font-medium text-on">{aberto ? "Fechar" : "Alterar"}</span>
          </button>
        </h2>
      ) : (
        <h2 className="mb-4 flex items-center gap-2.5 font-semibold">
          {marcador}
          {titulo}
        </h2>
      )}
      <div id={conteudo} hidden={!aberto}>
        {children}
      </div>
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
