"use client";

import Image from "next/image";
import { startTransition, useActionState, useRef, useState, type ChangeEvent } from "react";
import { Alerta, Botao } from "@/components/ui";
import { iniciais } from "@/lib/formato";
import { caminhoDaLogo, erroDaLogo, LIMITES_LOGO } from "@/lib/logo";
import { createClient } from "@/lib/supabase/client";
import { removerLogo, salvarLogo, type EstadoForm } from "./actions";

/**
 * Logo do salão: o arquivo vai do navegador direto para o Storage (a policy só deixa o Dono(a) gravar
 * na pasta do salão) e a ação do servidor liga o caminho ao salão e apaga a logo anterior.
 */
export function CampoLogo({ salaoId, nome, logoUrl }: { salaoId: string; nome: string; logoUrl: string | null }) {
  const [salvo, salvar, salvando] = useActionState<EstadoForm, FormData>(salvarLogo, {});
  const [removido, remover, removendo] = useActionState<EstadoForm, FormData>(removerLogo, {});
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);
  const ocupado = enviando || salvando || removendo;

  async function escolher(e: ChangeEvent<HTMLInputElement>) {
    const escolhido = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!escolhido) return;
    const problema = erroDaLogo(escolhido);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    setEnviando(true);
    const caminho = caminhoDaLogo(salaoId, escolhido.type);
    const { error } = await createClient()
      .storage.from("logos")
      .upload(caminho, escolhido, { contentType: escolhido.type, cacheControl: "31536000", upsert: false });
    setEnviando(false);
    if (error) {
      setErro("Não foi possível enviar a imagem. Tente de novo.");
      return;
    }
    const fd = new FormData();
    fd.set("caminho", caminho);
    startTransition(() => salvar(fd));
  }

  const mensagemErro = erro ?? salvo.erro ?? removido.erro;
  const mensagemOk = !ocupado && !mensagemErro ? (salvo.ok ?? removido.ok) : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={`Logo do ${nome}`}
            width={72}
            height={72}
            unoptimized
            className="size-18 rounded-2xl object-cover ring-1 ring-noite/10"
          />
        ) : (
          <span aria-hidden className="flex size-18 items-center justify-center rounded-2xl bg-on text-xl font-semibold text-white">
            {iniciais(nome)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-noite/80">Logo do salão</p>
          <p className="text-sm text-noite/65">Aparece na página de agendamento. PNG, JPG ou WebP, até 1 MB; de preferência quadrada.</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={arquivo}
            id="logo"
            type="file"
            accept={Object.keys(LIMITES_LOGO.tipos).join(",")}
            onChange={escolher}
            className="sr-only"
            aria-label="Escolher a logo do salão"
            disabled={ocupado}
          />
          <Botao type="button" variante="secundario" disabled={ocupado} onClick={() => arquivo.current?.click()}>
            {enviando || salvando ? "Enviando…" : logoUrl ? "Trocar logo" : "Enviar logo"}
          </Botao>
          {logoUrl ? (
            <form action={remover}>
              <Botao type="submit" variante="secundario" disabled={ocupado} className="text-red-700">
                {removendo ? "Removendo…" : "Remover"}
              </Botao>
            </form>
          ) : null}
        </div>
      </div>
      {mensagemErro ? <Alerta tipo="erro">{mensagemErro}</Alerta> : null}
      {mensagemOk ? <Alerta tipo="sucesso">{mensagemOk}</Alerta> : null}
    </div>
  );
}
