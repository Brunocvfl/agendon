"use client";

import { useEffect, useRef } from "react";

/**
 * Depois de cada resposta do servidor (`estado` novo), leva o foco ao primeiro campo com erro
 * (`aria-invalid="true"`) dentro do formulário. Erro geral (sem campo) já é anunciado pelo <Alerta>.
 *
 *   const form = useFocarPrimeiroErro(estado);
 *   <form ref={form} ...>
 */
export function useFocarPrimeiroErro(estado: unknown) {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [estado]);
  return form;
}
