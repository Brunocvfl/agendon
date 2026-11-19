"use client";

// Chamada final: o link do salão em letra grande, e o nome do salão é o próprio campo.
import { useState } from "react";
import { LIMITES_SALAO, normalizarSlug } from "@/lib/regras/salao";

// Como normalizarSlug, mas deixa o hífen do fim enquanto a pessoa ainda digita a próxima palavra.
function enquantoDigita(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, LIMITES_SALAO.slug.max);
}

export function LinkDoSalao() {
  const [nome, setNome] = useState("");
  const slug = normalizarSlug(nome);

  return (
    <div>
      <label htmlFor="nome-salao" className="text-base font-medium text-white/90">
        Digite o nome do seu salão
      </label>
      <div className="mt-4 text-[clamp(2rem,7.5vw,6.25rem)] leading-[0.95] font-semibold tracking-[-0.045em]">
        <span aria-hidden className="block font-extralight text-white/75">
          agendon.app.br/
        </span>
        <input
          id="nome-salao"
          type="text"
          autoComplete="organization"
          spellCheck={false}
          placeholder="seu-salao"
          value={nome}
          maxLength={LIMITES_SALAO.slug.max}
          onChange={(e) => setNome(enquantoDigita(e.target.value))}
          onBlur={() => setNome(slug)}
          aria-describedby="link-salao"
          className="mt-1 w-full border-b-4 border-white/40 bg-transparent pb-2 text-white caret-white outline-none placeholder:text-white/70 focus:border-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        />
      </div>
      <p id="link-salao" className="mt-5 text-base text-white/90">
        {slug ? (
          <>
            Seu link: <strong className="font-semibold">agendon.app.br/{slug}</strong>
          </>
        ) : (
          "Esse é o link que vai na bio do Instagram e no WhatsApp do salão."
        )}
      </p>
    </div>
  );
}
