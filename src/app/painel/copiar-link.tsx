"use client";

import { useState } from "react";

/** Copia o link da página de agendamento; avisa por 2 s (e para o leitor de tela). */
export function CopiarLink({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem permissão para a área de transferência: a pessoa ainda pode copiar o texto do link.
    }
  }
  return (
    <button type="button" onClick={copiar} className="font-medium text-on hover:underline">
      <span aria-live="polite">{copiado ? "Copiado!" : "Copiar link"}</span>
    </button>
  );
}
