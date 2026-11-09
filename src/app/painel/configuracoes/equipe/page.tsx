import type { Metadata } from "next";
import Link from "next/link";
import { Alerta, BotaoLink, Cartao } from "@/components/ui";
import { PaginaProtegida } from "@/components/pagina-protegida";
import type { Vinculo } from "@/lib/auth";
import { iniciais } from "@/lib/formato";
import { NOME_PERFIL, pode, type Perfil, type Permissao } from "@/lib/permissoes";
import { AbasConfiguracoes } from "../abas";
import { carregarEquipe, type Membro, type StatusMembro } from "./dados";

export const metadata: Metadata = { title: "Equipe e acessos · AgendOn" };

const AVISOS: Record<string, string> = {
  convite: "Convite enviado. A pessoa recebe um e-mail para criar a senha e entrar.",
  "convite-sem-agenda": "Convite enviado, mas não foi possível ligar a agenda. Edite a pessoa para escolher de novo.",
  reenviado: "Convite reenviado.",
  cancelado: "Convite cancelado.",
  salvo: "Alterações salvas.",
  desativado: "Acesso desativado.",
  reativado: "Acesso reativado.",
};

export default function PaginaEquipe({ searchParams }: PageProps<"/painel/configuracoes/equipe">) {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold sm:text-3xl">Configurações</h1>
        <BotaoLink href="/painel/configuracoes/equipe/convidar">+ Convidar pessoa</BotaoLink>
      </div>
      <AbasConfiguracoes ativa="Equipe e acessos" />
      <PaginaProtegida exige="gerenciar-salao" carregando={<Cartao className="mt-6 h-64">{null}</Cartao>}>
        {({ vinculo }) => <Conteudo vinculo={vinculo} searchParams={searchParams} />}
      </PaginaProtegida>
    </div>
  );
}

async function Conteudo({
  vinculo,
  searchParams,
}: {
  vinculo: Vinculo;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const aviso = typeof sp.aviso === "string" ? AVISOS[sp.aviso] : undefined;
  const equipe = await carregarEquipe(vinculo.salao.id);
  const ativos = equipe.filter((m) => m.status !== "inativo").length;

  return (
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
      <div className="flex flex-col gap-4">
        {aviso ? <Alerta tipo="sucesso">{aviso}</Alerta> : null}
        <Cartao className="!p-0 sm:!p-0">
          <div className="flex items-baseline justify-between gap-4 px-5 pt-5 sm:px-6">
            <h2 className="text-lg font-semibold">Pessoas com acesso</h2>
            <span className="text-sm text-noite/65">
              {ativos} {ativos === 1 ? "pessoa" : "pessoas"}
            </span>
          </div>
          <ul className="mt-3">
            {equipe.map((m) => (
              <Linha key={m.id} m={m} eu={m.id === vinculo.membroId} />
            ))}
          </ul>
        </Cartao>
      </div>
      <Matriz />
    </div>
  );
}

const ESTILO_STATUS: Record<StatusMembro, { rotulo: string; classe: string }> = {
  ativo: { rotulo: "Ativo", classe: "bg-confirmado/10 text-confirmado-escuro" },
  convidado: { rotulo: "Convite enviado", classe: "bg-amber-100 text-amber-800" },
  inativo: { rotulo: "Desativado", classe: "bg-noite/8 text-noite/65" },
};

function Linha({ m, eu }: { m: Membro; eu: boolean }) {
  const nome = m.nome ?? m.email;
  const status = ESTILO_STATUS[m.status];
  return (
    <li
      className={`relative flex items-center gap-3 border-t border-noite/8 px-5 py-3.5 hover:bg-fundo sm:px-6 ${m.status === "inativo" ? "opacity-70" : ""}`}
    >
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-on/10 text-sm font-semibold text-on">
        {iniciais(nome)}
      </span>
      <div className="min-w-0 flex-1">
        {/* O link cobre a linha inteira (::after), mas só o nome é lido como link. */}
        <Link href={`/painel/configuracoes/equipe/${m.id}`} className="font-semibold after:absolute after:inset-0 hover:text-on">
          {nome}
          {eu ? <span className="font-normal text-noite/65"> (você)</span> : null}
        </Link>
        {m.nome ? <p className="truncate text-sm text-noite/65">{m.email}</p> : null}
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-noite/75">
          <span>{NOME_PERFIL[m.perfil]}</span>
          <span>
            <span className="sr-only">Agenda: </span>
            {m.agenda ? `Agenda: ${m.agenda.nome}` : "Sem agenda"}
          </span>
        </p>
      </div>
      <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${status.classe}`}>{status.rotulo}</span>
    </li>
  );
}

// "O que cada perfil pode fazer": a matriz do CLAUDE.md, lida de permissoes.ts.
const LINHAS: { rotulo: string; permissao: Permissao }[] = [
  { rotulo: "Ver a agenda de todos", permissao: "ver-agenda-de-todos" },
  { rotulo: "Criar e remarcar agendamentos", permissao: "criar-agendamento" },
  { rotulo: "Mudar status (confirmar, concluir, faltou)", permissao: "mudar-status" },
  { rotulo: "Ver clientes, histórico e telefone", permissao: "ver-clientes" },
  { rotulo: "Exportar e anonimizar cliente (LGPD)", permissao: "dados-do-titular" },
  { rotulo: "Editar serviços e preços", permissao: "editar-servicos" },
  { rotulo: "Editar horários e folgas", permissao: "editar-horarios" },
  { rotulo: "Editar lembretes e link público", permissao: "editar-lembretes" },
  { rotulo: "Plano, cobrança e usuários", permissao: "gerenciar-salao" },
];
const COLUNAS: Perfil[] = ["dono", "recepcao", "profissional"];

function Matriz() {
  return (
    <Cartao className="!p-5 sm:!p-6">
      <h2 className="text-lg font-semibold">O que cada perfil pode fazer</h2>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-noite/65">
            <th scope="col" className="py-2 font-medium">
              Permissão
            </th>
            {COLUNAS.map((p) => (
              <th key={p} scope="col" className="w-16 py-2 text-center font-medium sm:w-20">
                {NOME_PERFIL[p]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {LINHAS.map((l) => (
            <tr key={l.permissao} className="border-t border-noite/8">
              <th scope="row" className="py-2.5 pr-2 text-left font-normal">
                {l.rotulo}
              </th>
              {COLUNAS.map((p) => (
                <td key={p} className="text-center">
                  {pode(p, l.permissao) ? (
                    <span className="font-semibold text-confirmado-escuro">
                      <span aria-hidden>✓</span>
                      <span className="sr-only">sim</span>
                    </span>
                  ) : (
                    <span className="text-noite/35">
                      <span aria-hidden>—</span>
                      <span className="sr-only">não</span>
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-noite/65">
        Profissional só cria, remarca e muda status na própria agenda. As permissões por perfil são fixas por enquanto.
      </p>
    </Cartao>
  );
}
