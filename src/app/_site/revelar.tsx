"use client";

// Site: faz as mídias marcadas com data-revelar entrarem uma vez, quando aparecem na tela.
// O CSS (globals.css) só esconde algo depois que este script liga a classe "revelar-pronto" no <html>;
// o que já está visível na hora é marcado antes, para não piscar. Sem IntersectionObserver ou com
// "reduzir movimento", não faz nada: tudo fica no estado final.
import { useEffect } from "react";

export function Revelar() {
  useEffect(() => {
    const raiz = document.documentElement;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const alvos = Array.from(document.querySelectorAll<HTMLElement>("[data-revelar]"));
    const altura = window.innerHeight;
    for (const el of alvos) {
      if (el.getBoundingClientRect().top < altura) el.dataset.revelado = "";
    }
    raiz.classList.add("revelar-pronto");

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.revelado = "";
          observador.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );
    for (const el of alvos) if (!("revelado" in el.dataset)) observador.observe(el);

    return () => {
      observador.disconnect();
      raiz.classList.remove("revelar-pronto");
    };
  }, []);

  return null;
}
