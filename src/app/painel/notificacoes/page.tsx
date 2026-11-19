import type { Metadata } from "next";
import Link from "next/link";
import { Cartao } from "@/components/ui";
import { PaginaProtegida } from "@/components/pagina-protegida";
import type { Vinculo } from "@/lib/auth";
import { quando } from "@/lib/datas";
import { corpoDoAviso, TITULO_NOVO_AGENDAMENTO } from "@/lib/push/aviso";
import { createClient } from "@/lib/supabase/server";
import { AvisosNesteAparelho, MarcarLidas } from "./avisos";

export const metadata: Metadata = { title: "Notificações · AgendOn" };

// Avisos de agendamento novo pela página pública. Dono(a) e Recepção: todo o salão;
// Profissional: só a própria agenda (o banco decide em minhas_notificacoes).
export default function PaginaNotificacoes() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold sm:text-3xl">Notificações</h1>
      <p className="mt-1 text-noite/70">Cada agendamento feito pela página do salão aparece aqui.</p>
      <Cartao className="mt-6">
        <h2 className="text-lg font-semibold">Avisos neste aparelho</h2>
        <p className="mt-1 text-sm text-noite/70">
          Receba um aviso no celular ou no computador, mesmo com o AgendOn fechado. Ligue em cada aparelho que
          você usa.
        </p>
        <div className="mt-4">
          <AvisosNesteAparelho chavePublica={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
        </div>
      </Cartao>
      <PaginaProtegida carregando={<Cartao className="mt-6 h-40">{null}</Cartao>}>
        {({ vinculo }) => <Lista vinculo={vinculo} />}
      </PaginaProtegida>
    </div>
  );
}

async function Lista({ vinculo }: { vinculo: Vinculo }) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("minhas_notificacoes", { p_limite: 50 });
  if (error) throw new Error("Falha ao carregar as notificações.");
  const naoLidas = data.some((n) => n.lida_em === null);

  if (data.length === 0) {
    return (
      <Cartao className="mt-6">
        <p className="text-sm text-noite/70">Nenhuma notificação ainda.</p>
      </Cartao>
    );
  }

  return (
    <Cartao className="mt-6 p-0 sm:p-0">
      {naoLidas ? <MarcarLidas /> : null}
      <ul className="divide-y divide-noite/8">
        {data.map((n) => (
          <li key={n.id} className="relative flex items-start gap-3 px-6 py-4 hover:bg-fundo sm:px-8">
            <span
              aria-hidden
              className={`mt-2 size-2 shrink-0 rounded-full ${n.lida_em === null ? "bg-on" : "bg-transparent"}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-noite/65">
                {TITULO_NOVO_AGENDAMENTO}
                {n.lida_em === null ? <span className="sr-only"> (nova)</span> : null}
              </p>
              {/* O link cobre a linha inteira (::after). */}
              <Link
                href={`/painel/agenda/${n.appointment_id}`}
                className="font-semibold after:absolute after:inset-0 hover:text-on"
              >
                {corpoDoAviso(n.cliente, n.servico)}
              </Link>
            </div>
            <p className="shrink-0 text-xs text-noite/60">{quando(n.criada_em, vinculo.salao.fuso)}</p>
          </li>
        ))}
      </ul>
    </Cartao>
  );
}
