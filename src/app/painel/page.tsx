import type { Metadata } from "next";
import { Suspense } from "react";
import { Cartao } from "@/components/ui";
import { exigirVinculo, type Perfil } from "@/lib/auth";
import { sair } from "@/app/(acesso)/actions";

export const metadata: Metadata = { title: "Painel · AgendOn" };

const NOME_PERFIL: Record<Perfil, string> = {
  dono: "Dono(a)",
  recepcao: "Recepção",
  profissional: "Profissional",
};

const PROXIMOS_PASSOS = [
  { titulo: "Cadastre os serviços", texto: "Nome, duração e preço de cada serviço." },
  { titulo: "Cadastre os profissionais", texto: "Quem atende, quais serviços faz e em que horários." },
  { titulo: "Defina o horário de funcionamento", texto: "Dias abertos, intervalos e feriados." },
  { titulo: "Divulgue seu link", texto: "Clientes agendam sozinhos, a qualquer hora." },
];

export default function PaginaPainel() {
  return (
    <Suspense fallback={<p className="text-sm text-noite/60">Carregando…</p>}>
      <Inicio />
    </Suspense>
  );
}

async function Inicio() {
  const { salao, perfil } = await exigirVinculo();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-noite/60">{NOME_PERFIL[perfil]}</p>
          <h1 className="text-2xl font-semibold sm:text-3xl">{salao.nome}</h1>
          <p className="mt-1 text-sm text-noite/60">
            Página de agendamento: <span className="font-medium text-noite">agendon.com.br/{salao.slug}</span>
          </p>
        </div>
        {/* No celular a barra lateral não mostra a conta; o botão de sair fica aqui. */}
        <form action={sair} className="md:hidden">
          <button type="submit" className="text-sm font-medium text-on hover:underline">
            Sair
          </button>
        </form>
      </div>

      <Cartao className="mt-8">
        <h2 className="text-lg font-semibold">Próximos passos</h2>
        <p className="mt-1 text-sm text-noite/60">Seu salão foi criado. Estas telas chegam nas próximas etapas.</p>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2">
          {PROXIMOS_PASSOS.map((passo, i) => (
            <li key={passo.titulo} className="flex gap-3 rounded-xl border border-noite/8 bg-fundo p-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-on/10 text-sm font-semibold text-on">
                {i + 1}
              </span>
              <div>
                <p className="font-medium">{passo.titulo}</p>
                <p className="text-sm text-noite/60">{passo.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </Cartao>
    </div>
  );
}
