import Image from "next/image";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";

// Página provisória da Fase 0: prova que o app conversa com o Supabase.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      <Image
        src="/logo-agendon.png"
        alt="AgendOn"
        width={4092}
        height={1230}
        priority
        className="h-auto w-64"
      />
      <section className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Ambiente de desenvolvimento</h1>
        <Suspense fallback={<p className="mt-4 text-sm text-noite/60">Verificando…</p>}>
          <Status />
        </Suspense>
      </section>
    </main>
  );
}

async function Status() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const conectado = await supabaseNoAr();

  return (
    <ul className="mt-4 space-y-2 text-sm">
      <li className="flex items-center gap-2">
        <Ponto ok={conectado} />
        Supabase {conectado ? "conectado" : "fora do ar (rode npm run db:start)"}
      </li>
      <li className="flex items-center gap-2">
        <Ponto ok={Boolean(data?.claims)} />
        {data?.claims ? "Sessão ativa" : "Sem sessão (login vem na Etapa 4)"}
      </li>
    </ul>
  );
}

async function supabaseNoAr() {
  const { url, publishableKey } = supabaseEnv();
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: publishableKey },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

function Ponto({ ok }: { ok: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-2.5 rounded-full ${ok ? "bg-confirmado" : "bg-noite/25"}`}
    />
  );
}
