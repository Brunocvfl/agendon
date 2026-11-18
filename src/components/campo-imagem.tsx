"use client";

import Image from "next/image";
import { startTransition, useActionState, useRef, useState, type ChangeEvent } from "react";
import { Enquadrador } from "@/components/enquadrador";
import { Alerta, Botao } from "@/components/ui";
import type { EstadoForm } from "@/lib/acao";
import { iniciais } from "@/lib/formato";
import { erroDaLogo, LIMITES_LOGO } from "@/lib/logo";
import { createClient } from "@/lib/supabase/client";

const MAXIMO_ORIGINAL = 15 * 1024 * 1024;

type Acao = (anterior: EstadoForm, fd: FormData) => Promise<EstadoForm>;

/**
 * Imagem guardada no Storage (logo do salão, foto do profissional): o arquivo vai do navegador direto
 * para o bucket público (a policy só deixa gravar na pasta do salão) e a ação do servidor liga o
 * caminho ao registro e apaga a imagem anterior. Caminho: `<pasta>/<prefixo>-<agora>.<ext>` (nome
 * único: trocar não esbarra no cache do navegador). `extras` vai junto nos dois formulários.
 */
export function CampoImagem({
  bucket,
  pasta,
  prefixo,
  extras = {},
  salvar: acaoSalvar,
  remover: acaoRemover,
  url,
  nome,
  redonda = false,
  enquadrar = false,
  titulo,
  descricao,
  rotulo,
}: {
  bucket: string;
  pasta: string;
  prefixo: string;
  extras?: Record<string, string>;
  salvar: Acao;
  remover: Acao;
  url: string | null;
  /** Para as iniciais e o texto alternativo. */
  nome: string;
  redonda?: boolean;
  /** Antes de enviar, abre o Enquadrador (zoom e posição) e envia um JPEG quadrado de 512 px. */
  enquadrar?: boolean;
  titulo: string;
  descricao: string;
  /** "logo", "foto": vira "Enviar logo", "Trocar foto"… */
  rotulo: string;
}) {
  const [salvo, salvar, salvando] = useActionState<EstadoForm, FormData>(acaoSalvar, {});
  const [removido, remover, removendo] = useActionState<EstadoForm, FormData>(acaoRemover, {});
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aEnquadrar, setAEnquadrar] = useState<File | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  const ocupado = enviando || salvando || removendo;
  const forma = redonda ? "rounded-full" : "rounded-2xl";

  async function escolher(e: ChangeEvent<HTMLInputElement>) {
    const escolhido = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!escolhido) return;
    // Com enquadramento, o arquivo original pode ser maior: o que sobe é o recorte de 512 px.
    const problema = enquadrar
      ? erroDaLogo({ type: escolhido.type, size: Math.min(escolhido.size, LIMITES_LOGO.bytes) }) ??
        (escolhido.size > MAXIMO_ORIGINAL ? "A imagem pode ter até 15 MB." : null)
      : erroDaLogo(escolhido);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    if (enquadrar) setAEnquadrar(escolhido);
    else await enviar(escolhido);
  }

  async function enviar(imagem: Blob) {
    setAEnquadrar(null);
    if (imagem.size > LIMITES_LOGO.bytes) {
      setErro("A imagem pode ter até 1 MB.");
      return;
    }
    setEnviando(true);
    const caminho = `${pasta}/${prefixo}-${Date.now()}.${LIMITES_LOGO.tipos[imagem.type]}`;
    const { error } = await createClient()
      .storage.from(bucket)
      .upload(caminho, imagem, { contentType: imagem.type, cacheControl: "31536000", upsert: false });
    setEnviando(false);
    if (error) {
      setErro("Não foi possível enviar a imagem. Tente de novo.");
      return;
    }
    const fd = new FormData();
    for (const [k, v] of Object.entries(extras)) fd.set(k, v);
    fd.set("caminho", caminho);
    startTransition(() => salvar(fd));
  }

  const mensagemErro = erro ?? salvo.erro ?? removido.erro;
  const mensagemOk = !ocupado && !mensagemErro ? (salvo.ok ?? removido.ok) : undefined;
  const idArquivo = `imagem-${prefixo}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        {url ? (
          <Image src={url} alt={`${titulo}: ${nome}`} width={72} height={72} unoptimized className={`size-18 object-cover ring-1 ring-noite/10 ${forma}`} />
        ) : (
          <span aria-hidden className={`flex size-18 items-center justify-center bg-on text-xl font-semibold text-white ${forma}`}>
            {iniciais(nome)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-noite/80">{titulo}</p>
          <p className="text-sm text-noite/65">{descricao}</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={arquivo}
            id={idArquivo}
            type="file"
            accept={Object.keys(LIMITES_LOGO.tipos).join(",")}
            onChange={escolher}
            className="sr-only"
            aria-label={`Escolher ${rotulo}`}
            disabled={ocupado}
          />
          <Botao type="button" variante="secundario" disabled={ocupado} onClick={() => arquivo.current?.click()}>
            {enviando || salvando ? "Enviando…" : url ? `Trocar ${rotulo}` : `Enviar ${rotulo}`}
          </Botao>
          {url ? (
            <form action={remover}>
              {Object.entries(extras).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <Botao type="submit" variante="secundario" disabled={ocupado} className="text-red-700">
                {removendo ? "Removendo…" : "Remover"}
              </Botao>
            </form>
          ) : null}
        </div>
      </div>
      {aEnquadrar ? (
        <Enquadrador key={`${aEnquadrar.name}-${aEnquadrar.lastModified}`} arquivo={aEnquadrar} redonda={redonda} onConfirmar={enviar} onCancelar={() => setAEnquadrar(null)} />
      ) : null}
      {mensagemErro ? <Alerta tipo="erro">{mensagemErro}</Alerta> : null}
      {mensagemOk ? <Alerta tipo="sucesso">{mensagemOk}</Alerta> : null}
    </div>
  );
}
