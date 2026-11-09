import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { dataNoFuso } from "@/lib/datas";
import { formatarTelefone, linkWhatsApp } from "@/lib/formato";
import { urlDaLogo } from "@/lib/logo";
import { formatarEndereco } from "@/lib/regras/salao";
import { carregarPaginaPublica } from "./dados";
import { AgendarPublico } from "./agendar-publico";

// Título com o nome do salão: aparece na aba e na prévia do link compartilhado no WhatsApp.
export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const pagina = await carregarPaginaPublica(slug);
  if (!pagina) return { title: "Agendar horário · AgendOn" };
  return {
    title: `${pagina.salao.nome} · Agendar horário`,
    description: `Agende seu horário online: ${pagina.salao.nome}.`,
  };
}

// Página pública do salão (agendon.app.br/<slug>): sem login, mobile first.
export default function PaginaPublica({ params }: PageProps<"/[slug]">) {
  return (
    <div className="flex flex-1 flex-col">
      <main id="conteudo" className="mx-auto w-full max-w-xl flex-1 px-4 py-6 sm:py-10">
        <Suspense fallback={<div className="h-96" />}>
          <Conteudo params={params} />
        </Suspense>
      </main>
      <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 pb-8 text-xs text-noite/65">
        <Link href="/" className="flex items-center gap-1.5 hover:text-on">
          Agendamento por
          <Image src="/logo-agendon.png" alt="AgendOn" width={64} height={19} className="h-auto w-16" />
        </Link>
        <Link href="/privacidade" className="hover:text-on">
          Privacidade
        </Link>
      </footer>
    </div>
  );
}

async function Conteudo({ params }: { params: PageProps<"/[slug]">["params"] }) {
  const { slug } = await params;
  const pagina = await carregarPaginaPublica(slug);
  if (!pagina) notFound();

  const { salao } = pagina;
  const endereco = formatarEndereco(salao.endereco);
  return (
    <>
      <header className="mb-6 flex items-start gap-4">
        {salao.logo_path ? (
          <Image
            src={urlDaLogo(salao.logo_path)}
            alt=""
            width={64}
            height={64}
            unoptimized
            priority
            className="size-16 shrink-0 rounded-2xl object-cover ring-1 ring-noite/10"
          />
        ) : null}
        <div className="min-w-0">
          <p className="text-sm font-medium text-on">Agende seu horário</p>
          <h1 className="mt-1 text-2xl font-semibold break-words sm:text-3xl">{salao.nome}</h1>
          {endereco ? <p className="mt-1 text-sm text-noite/65">{endereco}</p> : null}
          {salao.whatsapp || salao.instagram ? (
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {salao.whatsapp ? (
                <a href={linkWhatsApp(salao.whatsapp)} target="_blank" rel="noopener noreferrer" className="font-medium text-on hover:underline">
                  WhatsApp {formatarTelefone(salao.whatsapp)}
                </a>
              ) : null}
              {salao.instagram ? (
                <a
                  href={`https://instagram.com/${salao.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-on hover:underline"
                >
                  @{salao.instagram}
                </a>
              ) : null}
            </p>
          ) : null}
        </div>
      </header>
      {pagina.servicos.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-noite/70 shadow-sm">
          Este salão ainda não abriu horários para agendamento online.
        </p>
      ) : (
        <AgendarPublico slug={slug} pagina={pagina} hoje={dataNoFuso(new Date(), salao.fuso)} />
      )}
    </>
  );
}
