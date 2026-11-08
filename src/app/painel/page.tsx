import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cartao } from "@/components/ui";
import { exigirVinculo } from "@/lib/auth";
import { NOME_PERFIL, pode } from "@/lib/permissoes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Painel · AgendOn" };

export default function PaginaPainel() {
  return (
    <Suspense fallback={<p className="text-sm text-noite/60">Carregando…</p>}>
      <Inicio />
    </Suspense>
  );
}

// Quanto da configuração inicial já foi feito (contagens leves, sem trazer linhas).
async function progresso(salonId: string) {
  const supabase = await createClient();
  const contar = async (tabela: "services" | "professionals" | "working_hours") => {
    const { count } = await supabase.from(tabela).select("*", { count: "exact", head: true }).eq("salon_id", salonId);
    return count ?? 0;
  };
  const [servicos, profissionais, horarios] = await Promise.all([
    contar("services"),
    contar("professionals"),
    contar("working_hours"),
  ]);
  return { servicos, profissionais, horarios };
}

async function Inicio() {
  const { salao, perfil } = await exigirVinculo();
  const p = await progresso(salao.id);
  const dono = pode(perfil, "editar-servicos");

  const passos = [
    {
      titulo: "Cadastre os serviços",
      texto: "Nome, duração e preço do que o salão oferece.",
      feito: p.servicos > 0,
      href: dono ? (p.servicos > 0 ? "/painel/servicos" : "/painel/servicos/novo") : "/painel/servicos",
    },
    {
      titulo: "Cadastre quem atende",
      texto: "Cada profissional e os serviços que faz. Se você atende, cadastre-se também.",
      feito: p.profissionais > 0,
      href: dono && p.profissionais === 0 ? "/painel/profissionais/novo" : "/painel/profissionais",
    },
    {
      titulo: "Defina os horários de trabalho",
      texto: "Dias, horários e pausas de cada profissional.",
      feito: p.horarios > 0,
      href: "/painel/profissionais",
    },
    {
      titulo: "Divulgue seu link",
      texto: "Clientes agendam sozinhos pela sua página. Chega na próxima etapa.",
      feito: false,
      href: null,
    },
  ];
  const feitos = passos.filter((x) => x.feito).length;

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm text-noite/60">{NOME_PERFIL[perfil]}</p>
      <h1 className="text-2xl font-semibold sm:text-3xl">{salao.nome}</h1>
      <p className="mt-1 break-words text-sm text-noite/60">
        Página de agendamento: <span className="font-medium text-noite">agendon.com.br/{salao.slug}</span>
      </p>

      <Cartao className="mt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold">Deixe o salão pronto para agendar</h2>
          <span className="shrink-0 text-sm tabular-nums text-noite/60">
            {feitos} de {passos.length}
          </span>
        </div>
        <div aria-hidden className="mt-3 h-1.5 overflow-hidden rounded-full bg-noite/[0.06]">
          <div className="h-full rounded-full bg-confirmado" style={{ width: `${(feitos / passos.length) * 100}%` }} />
        </div>

        <ol className="mt-6 flex flex-col gap-2">
          {passos.map((passo, i) => {
            const conteudo = (
              <>
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    passo.feito ? "bg-confirmado text-white" : "bg-on/10 text-on"
                  }`}
                >
                  {passo.feito ? (
                    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="min-w-0">
                  <span className={`block font-medium ${passo.feito ? "text-noite/55 line-through decoration-noite/30" : ""}`}>
                    {passo.titulo}
                    <span className="sr-only">{passo.feito ? " (feito)" : ""}</span>
                  </span>
                  <span className="block text-sm text-noite/60">{passo.texto}</span>
                </span>
              </>
            );
            return (
              <li key={passo.titulo}>
                {passo.href ? (
                  <Link
                    href={passo.href}
                    className="flex gap-3 rounded-xl p-3 transition-colors hover:bg-fundo focus-visible:outline-2 focus-visible:outline-on"
                  >
                    {conteudo}
                  </Link>
                ) : (
                  <div className="flex gap-3 p-3 opacity-70">{conteudo}</div>
                )}
              </li>
            );
          })}
        </ol>
      </Cartao>
    </div>
  );
}
