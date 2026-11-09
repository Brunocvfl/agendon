"use client";

import { useEffect } from "react";

/**
 * Com mudanças não salvas, o navegador pergunta antes de fechar, recarregar ou sair do site.
 * Não cobre a navegação interna do Next (<Link>), que não dispara `beforeunload`.
 */
export function useAvisoAoSair(naoSalvo: boolean) {
  useEffect(() => {
    if (!naoSalvo) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [naoSalvo]);
}
