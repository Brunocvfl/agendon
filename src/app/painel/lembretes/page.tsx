import type { Metadata } from "next";
import { Cartao } from "@/components/ui";
import { PaginaProtegida } from "@/components/pagina-protegida";
import type { Vinculo } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TEXTOS } from "@/lib/whatsapp/template";
import { FormLembrete } from "./form-lembrete";

export const metadata: Metadata = { title: "Lembretes · AgendOn" };

// Lembretes por WhatsApp (wireframe 5): confirmação (sempre ligada) e lembrete com antecedência escolhida.
export default function PaginaLembretes() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold sm:text-3xl">Lembretes por WhatsApp</h1>
      <p className="mt-1 text-noite/70">Mensagens automáticas para os clientes que aceitaram receber pelo WhatsApp.</p>
      <PaginaProtegida exige="editar-lembretes" carregando={<Cartao className="mt-6 h-64">{null}</Cartao>}>
        {({ vinculo }) => <Conteudo vinculo={vinculo} />}
      </PaginaProtegida>
    </div>
  );
}

async function Conteudo({ vinculo }: { vinculo: Vinculo }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salons")
    .select("nome, lembrete_horas")
    .eq("id", vinculo.salao.id)
    .single();
  if (error) throw new Error("Falha ao carregar os lembretes.");

  // Prévia com dados de exemplo (quinta, 12 nov, 15:30 em São Paulo).
  const exemplo = {
    nome: "Marina",
    salao: data.nome,
    servico: "Corte feminino",
    profissional: "Ana",
    inicio: "2026-11-12T18:30:00Z",
    fuso: "America/Sao_Paulo",
  };

  return (
    <>
      <Cartao className="mt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Confirmação do agendamento</h2>
            <p className="mt-1 text-sm text-noite/70">Logo depois que o agendamento é feito, pela página ou pelo painel.</p>
          </div>
          <span className="shrink-0 rounded-full bg-confirmado/10 px-3 py-1 text-xs font-semibold text-noite">
            Sempre ligada
          </span>
        </div>
        <Previa texto={TEXTOS.confirmacao(exemplo)} />
      </Cartao>

      <Cartao className="mt-6">
        <h2 className="text-lg font-semibold">Lembrete antes do horário</h2>
        <p className="mt-1 text-sm text-noite/70">
          Vai para agendamentos marcados ou confirmados. Quem agenda já dentro desse prazo recebe só a confirmação.
        </p>
        <div className="mt-4">
          <FormLembrete inicial={data.lembrete_horas} />
        </div>
        <Previa texto={TEXTOS.lembrete(exemplo)} />
      </Cartao>

      <p className="mt-4 text-sm text-noite/65">
        Os textos são modelos aprovados pela Meta, iguais para todos os salões. Quem responder SAIR deixa de receber
        mensagens.
      </p>
    </>
  );
}

function Previa({ texto }: { texto: string }) {
  return (
    <figure className="mt-4">
      <figcaption className="text-xs font-semibold uppercase tracking-wide text-noite/60">Prévia no WhatsApp</figcaption>
      <div className="mt-2 rounded-2xl bg-[#E9E2D8] p-4">
        <p className="max-w-md rounded-xl rounded-tl-none bg-white px-4 py-3 text-sm text-noite shadow-sm">{texto}</p>
      </div>
    </figure>
  );
}
