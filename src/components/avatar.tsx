import Image from "next/image";
import { iniciais } from "@/lib/formato";

/**
 * Foto redonda de uma pessoa, ou as iniciais quando não há foto. Decorativo: o nome sempre aparece
 * ao lado, então a imagem não é lida pelo leitor de tela.
 */
export function Avatar({
  nome,
  foto,
  tamanho = 48,
  className = "bg-on/10 text-on",
}: {
  nome: string;
  foto: string | null;
  /** Em px (a classe de tamanho segue junto). */
  tamanho?: number;
  /** Cores das iniciais. */
  className?: string;
}) {
  const estilo = { width: tamanho, height: tamanho };
  return foto ? (
    <Image src={foto} alt="" aria-hidden width={tamanho} height={tamanho} unoptimized style={estilo} className="shrink-0 rounded-full object-cover ring-1 ring-noite/10" />
  ) : (
    <span
      aria-hidden
      style={{ ...estilo, fontSize: Math.round(tamanho * 0.32) }}
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${className}`}
    >
      {iniciais(nome)}
    </span>
  );
}
