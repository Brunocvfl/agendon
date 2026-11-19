"use client";

// Versão 1: o visitante digita o nome do salão e vê como fica o link.
import { useState } from "react";
import { normalizarSlug } from "@/lib/regras/salao";

export function LinkSimples() {
  const [nome, setNome] = useState("");
  const slug = normalizarSlug(nome) || "seu-salao";

  return (
    <div>
      <label htmlFor="nome-salao-v1" className="text-sm font-medium text-white/80">
        Nome do seu salão
      </label>
      <input
        id="nome-salao-v1"
        type="text"
        autoComplete="organization"
        placeholder="Ex.: Studio Bela Vida"
        value={nome}
        maxLength={80}
        onChange={(e) => setNome(e.target.value)}
        className="mt-2 h-12 w-full rounded-xl border border-white/20 bg-white/10 px-4 text-base text-white outline-none placeholder:text-white/70 focus:border-white focus:ring-2 focus:ring-white/30"
      />
      <p className="mt-6 text-sm text-white/75">Seu link de agendamento</p>
      <p className="mt-1 font-semibold tracking-tight">
        <span className="block text-xl text-white/80 sm:text-2xl">agendon.app.br/</span>
        <span className="block text-3xl [overflow-wrap:anywhere] sm:text-4xl">{slug}</span>
      </p>
    </div>
  );
}
