// Molduras das capturas reais do produto no site (salão de vitrine local, clientes fictícios).
// Inventário e origem das imagens: docs/site/inventario-imagens.md.
import Image from "next/image";

/** Captura do painel no computador, numa moldura mínima de navegador. */
export function MolduraNavegador({
  src,
  alt,
  largura,
  altura,
  url,
  sizes,
  className = "",
}: {
  src: string;
  alt: string;
  largura: number;
  altura: number;
  url: string;
  sizes: string;
  className?: string;
}) {
  return (
    <figure
      data-revelar
      className={`overflow-hidden rounded-2xl bg-white shadow-[0_30px_60px_-30px_rgb(15_27_77/0.45)] ring-1 ring-noite/10 ${className}`}
    >
      <div aria-hidden className="flex items-center gap-3 border-b border-noite/8 bg-fundo px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-noite/15" />
          <span className="size-2.5 rounded-full bg-noite/15" />
          <span className="size-2.5 rounded-full bg-noite/15" />
        </span>
        <span className="truncate rounded-md bg-white px-3 py-1 text-xs text-noite/65 ring-1 ring-noite/8">{url}</span>
      </div>
      {/* No celular, a tela inteira ficaria ilegível: mostra o canto de cima, à esquerda, ampliado. */}
      <div className="max-sm:aspect-[5/6] max-sm:overflow-hidden">
        <Image src={src} alt={alt} width={largura} height={altura} sizes={sizes} className="h-auto w-full max-sm:w-[230%] max-sm:max-w-none" />
      </div>
    </figure>
  );
}

/** Captura de tela do celular, na mesma moldura da demonstração de agendamento. */
export function MolduraCelular({
  src,
  alt,
  sizes = "(min-width: 1024px) 18rem, 70vw",
  className = "",
  children,
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <figure className={`relative mx-auto w-full max-w-[17.5rem] ${className}`}>
      <div className="relative aspect-[390/760] overflow-hidden rounded-[2.6rem] border-[9px] border-noite bg-white shadow-[0_30px_60px_-20px_rgb(15_27_77/0.45)]">
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover object-top" />
      </div>
      {children}
    </figure>
  );
}

/** O aviso que chega no celular a cada agendamento pela página do salão (texto de avisoDeAgendamento). */
export function AvisoNovoAgendamento({ className = "" }: { className?: string }) {
  return (
    // Decorativo: o texto da seção já diz o que o aviso traz.
    <div
      aria-hidden
      className={`flex w-[17rem] items-start gap-3 rounded-2xl bg-white/95 p-3.5 text-noite shadow-[0_18px_40px_-16px_rgb(15_27_77/0.5)] ring-1 ring-noite/8 backdrop-blur ${className}`}
    >
      <Image src="/app/icone-192.png" alt="" width={192} height={192} className="size-9 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 leading-snug">
        <p className="flex items-center justify-between gap-2 text-xs text-noite/65">
          <span className="font-semibold">AgendOn</span>
          <span>agora</span>
        </p>
        <p className="mt-0.5 text-sm font-semibold">Novo agendamento</p>
        <p className="truncate text-sm text-noite/75">Marina · Corte feminino</p>
      </div>
    </div>
  );
}
