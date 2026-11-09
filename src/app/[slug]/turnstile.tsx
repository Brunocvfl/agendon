"use client";

import { useEffect, useRef } from "react";

type Turnstile = {
  render: (el: HTMLElement, opcoes: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
    aoCarregarTurnstile?: () => void;
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=aoCarregarTurnstile";

// Widget do Cloudflare Turnstile. O token vai num campo escondido "cf-turnstile-response" do formulário.
// Para trocar o token (depois de um envio), remonte o componente com outra `key`.
export function Turnstile() {
  const caixa = useRef<HTMLDivElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !caixa.current) return;
    let id: string | undefined;
    const desenhar = () => {
      if (caixa.current && window.turnstile && !id) {
        id = window.turnstile.render(caixa.current, { sitekey: siteKey, language: "pt-br", size: "flexible" });
      }
    };
    if (window.turnstile) desenhar();
    else {
      window.aoCarregarTurnstile = desenhar;
      if (!document.querySelector(`script[src="${SCRIPT}"]`)) {
        const s = document.createElement("script");
        s.src = SCRIPT;
        s.async = true;
        document.head.appendChild(s);
      }
    }
    return () => {
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [siteKey]);

  if (!siteKey) return <p className="text-sm text-red-600">Verificação indisponível (falta a chave do CAPTCHA).</p>;
  return <div ref={caixa} className="min-h-[65px]" />;
}
