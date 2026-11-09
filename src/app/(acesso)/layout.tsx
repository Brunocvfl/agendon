import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

export default function LayoutAcesso({ children }: { children: ReactNode }) {
  return (
    <main id="conteudo" className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-16">
      <Link href="/" className="mb-8" aria-label="AgendOn, página inicial">
        <Image src="/logo-agendon.png" alt="AgendOn" width={192} height={58} priority className="h-auto w-48" />
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <nav className="mt-8 flex gap-4 text-sm text-noite/65">
        <Link href="/termos" className="hover:text-on">
          Termos de Uso
        </Link>
        <Link href="/privacidade" className="hover:text-on">
          Privacidade
        </Link>
      </nav>
    </main>
  );
}
