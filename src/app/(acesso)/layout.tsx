import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

export default function LayoutAcesso({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-16">
      <Link href="/" className="mb-8" aria-label="AgendOn, página inicial">
        <Image src="/logo-agendon.png" alt="AgendOn" width={4092} height={1230} priority className="h-auto w-48" />
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
