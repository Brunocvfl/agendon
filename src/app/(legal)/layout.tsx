import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { DATA_DOCUMENTOS } from "@/lib/legal";

// Páginas legais: texto corrido, legível no celular.
export default function LayoutLegal({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-noite/10 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" aria-label="AgendOn, página inicial">
            <Image src="/logo-agendon.png" alt="AgendOn" width={128} height={38} priority className="h-auto w-32" />
          </Link>
          <nav className="flex gap-4 text-sm font-medium">
            <Link href="/termos" className="text-noite/70 hover:text-on">
              Termos
            </Link>
            <Link href="/privacidade" className="text-noite/70 hover:text-on">
              Privacidade
            </Link>
          </nav>
        </div>
      </header>
      <main id="conteudo" className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <article className="rounded-2xl bg-white p-5 text-[15px] leading-relaxed text-noite/85 shadow-sm sm:p-10 [&_a]:font-medium [&_a]:text-on [&_a]:underline [&_a]:underline-offset-2 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-noite sm:[&_h1]:text-3xl [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-noite [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-noite [&_li]:mt-1.5 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-3 [&_strong]:text-noite [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
          <p className="!mt-10 border-t border-noite/10 pt-5 text-sm text-noite/65">
            Última atualização: {DATA_DOCUMENTOS}.
          </p>
        </article>
      </main>
    </div>
  );
}
